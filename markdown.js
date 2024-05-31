/**
 * This module for functions and classes that directly
 * modify markdown. Diurnum uses [mdast](https://github.com/syntax-tree/mdast)
 * to parse markdown.
 */
import yaml from 'js-yaml';
import { visit } from 'unist-util-visit';
import { fromMarkdown } from 'mdast-util-from-markdown';
import {
    frontmatterFromMarkdown, frontmatterToMarkdown
} from 'mdast-util-frontmatter';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown } from 'mdast-util-to-markdown';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';

// import { TextOrb } from './textorbs.js';
// import { DIURNUM_PROTOCOL } from '../filesystem/config.js';

export class LocalTextOrb {
    type = 'textOrb'

    constructor(textOrb, depth, refType) {
        this.depth = depth;
        this.textOrb = textOrb;
        this.refType = refType;
    }

    get content() {
        return {
            ...this.textOrb.content,
            depth: this.depth,
            refType: this.refType
        }
    }

    get alias() {
        return this.textOrb.alias;
    }

    get id() {
        return this.textOrb.id;
    }

    get children() {
        return this.textOrb.children;
    }

    set children(children) {
        this.textOrb.content.children = children;
    }

    addChild(child) {
        this.textOrb.content.children.push(child);
    }
}

// /**
// * Checks to see if the given mdast node is a diurnum header
// *
// * @param node mdast node to check
// * @returns whether or not this is a diurnum heading
// */
// export function isDiurnumHeading(node) {
//     if (node.type != "heading") {
//         return false;
//     }
//     else if (node.children[0].type != "link") {
//         return false;
//     }
//     else if (!node.children[0].url.startsWith(DIURNUM_PROTOCOL)) {
//         return false;
//     }
//     else if (node.children[0].children[0].type != "text") {
//         return false;
//     }
//     return true;
// }

/**
 * Adds the "parsedYaml" property to yaml and code blocks.
 *
 * FIXME: handle images
 *
 * @param {mdast.Nodes} node
 * @param {mdast.ParseOptions} options
 */
export function parseMdastNode(node) {
    if ((node.type == "code") && (node.lang === "yaml")) {
        const yamlCodeNode = node;
        yamlCodeNode.parsedYaml = yaml.load(node.value);
        node = yamlCodeNode;
    }
    else if (node.type === "yaml") {
        const yamlNode = node;
        yamlNode.parsedYaml = yaml.load(node.value);
        node = yamlNode;
    }
    else if (node.hasOwnProperty('children')) {
        const parentNode = node;
        parentNode.children.forEach(child => { parseMdastNode(child); });
        node = parentNode;
    }
}

/**
 * converts an mdast tree to markdown text.
 *
 * Uses github flavored markdown
 * @param tree mdast tree
 * @returns {string} markdown text
 */
export function treeToMarkdown(tree) {
    return toMarkdown(tree, {
        extensions: [gfmToMarkdown(), frontmatterToMarkdown(['yaml', 'toml'])],
        bullet: '-',
        handlers: {
            textOrb(
                node,
                parent,
                state,
                info
            ) {
                if (node.refType === 'strip') return '';
                // FIXME: decide whether or not to keep relative
                // const link = `[${node.alias}](diurnum://${node.id})`;
                const link = `[${node.alias}](../${node.id}/orb.md)`;

                if (node.refType === 'link') {
                    const depth = node?.depth || 1;
                    return `${'#'.repeat(depth)} > ${link}`.trim();
                }
                const text = (node.children || []).map(child => {
                    let newChild;
                    const depth = node?.depth || 0;
                    if (child.type === 'heading') {
                        // if ((depth + child.depth) > 6) {
                        //     throw Error('Heading too nested')
                        // }
                        newChild = {
                            ...child,
                            depth: (depth + (child.depth || 1))
                        }
                        return state.handle(newChild, node, state, info);
                    } else if (child.type === 'textOrb') {
                        if (child.refType === 'strip') {
                            return '';
                        }
                        return state.handle({
                            type: 'textOrb',
                            id: child.id,
                            alias: child.alias,
                            refType: child.refType,
                            children: child.children,
                            depth: depth + (child.depth || 1),
                        }, node, state, info);
                    } else {
                        if (child.type === 'list') {
                            // FIXME: shouldn't have to do this, but the
                            //        bullet parameter isn't respected.
                            //        Need to file a github issue.
                            return treeToMarkdown(child).trim();
                        } else {
                            return state.handle(child, node, state, info);
                        }
                    }
                }).filter(result => !!result).join('\n\n');
                if (!node.depth) return text;
                const depth = node?.depth || 1;
                return `${'#'.repeat(depth)} ${link}\n\n${text}`.trim();;
            }
        }
    });
}

/**
 * converts markdown text to an mdast tree.
 *
 * NB: uses the recursive parseMdastNode function
 *
 * @param {string} text
 * @returns {*} mdast tree
 */
export function markdownToTree(text) {
    const tree = fromMarkdown(text, {
        extensions: [gfm(), frontmatter(['yaml', 'toml'])],
        mdastExtensions: [
            gfmFromMarkdown(),
            frontmatterFromMarkdown(['yaml', 'toml'])
        ]
    });
    parseMdastNode(tree);
    return tree;
}


// /**
//  * @param node initialize a textorb from a heading link
//  * @returns TextOrb (initialized with no content)
//  */
// export function initializeTextOrbFromHeading(
//     node,
//     { prohibitEmbeds = false } = {}
// ) {
//     const link = node.children[0];
//     const text = link.children[0];
//     const name = text.value;
//     const url = new URL(link.url);
//     const id = url.host === "new" ? crypto.randomUUID() : url.host;
//     const type = url.searchParams.get('type') || 'plain';
//     const refType = (
//         url.searchParams.get('ref') ||
//         (prohibitEmbeds ? 'link' : 'embed')
//     );
//     if (!['link', 'embed', 'strip'].includes(refType)) {
//         throw new Error(`Invalid ref type "${refType}"`);
//     } else if ((refType === 'embed') && (prohibitEmbeds)) {
//         throw new Error(`Embeds are prohibited in this context.`);
//     }

//     // FIXME: I shouldn't be mutating any text values here
//     // if (refType === 'link') {
//     //     const newLink = `[${name}](diurnum://${id})`;
//     //     const t = `${'#'.repeat(node.depth)} > ${newLink}`.trim();
//     //     const newHeading = markdownToTree(t).children[0] as Heading;
//     //     node.children = newHeading.children;
//     // }
//     return {
//         refType: refType,
//         textOrb: new TextOrb(name, id, type),
//     }
// }

/**
 * Finds all the textorbs in a given mdast tree
 * (which corresponds to a single markdown string).
 *
 * Each
 *
 * @param tree root node for mdast tree
 * @returns list of textorbs in order of appearance
 */
export function parseTextOrbsFromMdast(
    tree,
    options = {}
) {
    const localTextOrbs = options.startingTextOrb ?
        [options.startingTextOrb] : []
    const stack = options.startingTextOrb ?
        [options.startingTextOrb] : [];
    const textOrbs = options.startingTextOrb ?
        [options.startingTextOrb.textOrb] : [];

    tree.children.forEach(child => {
        if (child.type == "heading") {
            let lastTextOrb = stack[stack.length - 1];
            let lastDepth = lastTextOrb?.depth || 0;

            while ((stack.length > 0) && (lastDepth >= child.depth)) {
                stack.pop();
                lastTextOrb = stack[stack.length - 1];
                lastDepth = lastTextOrb?.depth || 0;
            }

            if (isDiurnumHeading(child)) {
                const {
                    textOrb: newTextOrb,
                    refType
                } = initializeTextOrbFromHeading(child, options);
                const localTextOrb = new LocalTextOrb(
                    newTextOrb,
                    child.depth,
                    refType
                );
                if (stack.length > 0) {
                    if (child.depth > lastTextOrb.depth) {
                        lastTextOrb.addChild(new LocalTextOrb(
                            newTextOrb,
                            child.depth - lastDepth,
                            refType
                        ));
                    }
                }
                textOrbs.push(newTextOrb);
                stack.push(localTextOrb);
                localTextOrbs.push(localTextOrb);
            } else if (lastTextOrb) {
                child.depth -= lastDepth;
                lastTextOrb.addChild(child);
            }
        } else if (stack.length > 0) {
            const lastTextOrb = stack[stack.length - 1].textOrb;
            lastTextOrb.addChild(child);
        }
    });

    return textOrbs;
}

/**
 * finds all links within an mdast tree and runs the handler on them
 */
export async function handleMdastLinks(root, handler) {
    const links = [];
    visit(root, 'link', function (node) {
        links.push(node);
    });

    await Promise.all(links.map((link) => {
        return handler(link);
    }));
}
