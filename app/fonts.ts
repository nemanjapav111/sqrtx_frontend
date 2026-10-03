import { Inter } from 'next/font/google';

// Inter, the variable font (every weight from one file), with its optical-size axis: Inter draws large text (a heading, a price) with tighter, finer
// letters than small text, which is what makes big type look made rather than just enlarged; the browser picks the cut by the text's size
// (font-optical-sizing: auto, globals.css). Only the Latin subset is preloaded: the languages beyond it (Latin-extended letters such as č ć š đ ž,
// Cyrillic) are to be decided later (owner, 2026-10-02). Next still lists the other subsets in the font's CSS, but a browser only downloads one when
// a page actually contains one of its letters, so they cost nothing until then.
export const inter = Inter({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });
