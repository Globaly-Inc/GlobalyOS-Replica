/**
 * Shared Prism.js configuration for syntax highlighting
 * Used by both WikiRichEditor and WikiMarkdownRenderer
 */

import Prism from 'prismjs';

// Import Prism languages - order matters for dependencies
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-perl';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-elixir';
import 'prismjs/components/prism-haskell';

/**
 * Maps user-friendly language names to Prism.js grammar keys
 */
export const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  'c#': 'csharp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  html: 'markup',
  css: 'css',
  sql: 'sql',
  bash: 'bash',
  shell: 'bash',
  json: 'json',
  yaml: 'yaml',
  xml: 'markup',
  markdown: 'markdown',
  graphql: 'graphql',
  dart: 'dart',
  scala: 'scala',
  r: 'r',
  lua: 'lua',
  perl: 'perl',
  'objective-c': 'objectivec',
  objectivec: 'objectivec',
  elixir: 'elixir',
  haskell: 'haskell',
  'plain text': 'plaintext',
  plaintext: 'plaintext',
};

/**
 * List of supported language options for UI dropdowns
 */
export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'HTML',
  'CSS',
  'SQL',
  'Bash',
  'JSON',
  'YAML',
  'Markdown',
  'GraphQL',
  'Dart',
  'Scala',
  'R',
  'Lua',
  'Perl',
  'Objective-C',
  'Elixir',
  'Haskell',
  'Plain Text',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Gets the Prism grammar key for a language name
 * @param language - User-friendly language name
 * @returns Prism grammar key or 'plaintext' if not found
 */
export const getPrismLanguage = (language: string): string => {
  return LANGUAGE_MAP[language.toLowerCase()] || 'plaintext';
};

/**
 * Highlights code using Prism.js
 * @param code - The code to highlight
 * @param language - The language name
 * @returns HTML string with highlighted code
 */
export const highlightCode = (code: string, language: string): string => {
  const prismLang = getPrismLanguage(language);
  const grammar = Prism.languages[prismLang];
  
  if (!grammar) {
    return code;
  }
  
  return Prism.highlight(code, grammar, prismLang);
};

// Re-export Prism for direct use if needed
export { Prism };
