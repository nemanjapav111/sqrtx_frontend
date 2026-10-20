// What the list restore (app/[lang]/components/list-restore.ts) and the script that hides a freshly loaded page until it is done (below, used by app/[lang]/layout.tsx) agree on.
// A plain module (no "use client") so that the server-side layout can use the script's text.

/** The note the back arrow of a product's page leaves: the address of the list it leads to. */
export const BACK_NOTE = "sqrtx:back-to";
/** The start of the sessionStorage names the lists are kept under (then the list's name). */
export const LIST_KEY_PREFIX = "sqrtx:list:";
/** On <html> while a freshly loaded page waits for its list to be put back (globals.css hides the page's <main> meanwhile). */
export const RESTORING_ATTRIBUTE = "data-restoring";

// Runs while the browser reads the page, before the first paint of a FULL page load. When the visitor is coming back to a list (Back / Forward, or the back arrow's note) and a saved copy of it
// exists for this address, the server's page (the list's first page, at the top) must not be seen for the moment until the browser has run the site's scripts and put the saved list back:
// that moment showed the top of the list and then jumped to where the visitor was. The list's own code removes the attribute when it is done; the timer is only for when it never does
// (a script that failed, a list that does not match any more).
export const HIDE_UNTIL_RESTORED_SCRIPT = `(function(){try{var n=performance.getEntriesByType("navigation")[0],s=sessionStorage;if(!((n&&n.type==="back_forward")||s.getItem("${BACK_NOTE}")===location.pathname))return;for(var i=0;i<s.length;i++){var k=s.key(i);if(k&&k.indexOf("${LIST_KEY_PREFIX}")===0){var o=JSON.parse(s.getItem(k));if(o&&o.path===location.pathname){var r=document.documentElement;r.setAttribute("${RESTORING_ATTRIBUTE}","");setTimeout(function(){r.removeAttribute("${RESTORING_ATTRIBUTE}")},3000);return}}}}catch(e){}})()`;
