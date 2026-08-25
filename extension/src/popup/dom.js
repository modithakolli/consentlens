export const el = (id) => document.getElementById(id);

export function replace(node, children) {
  if (!node) return;
  node.replaceChildren(...children.filter(Boolean));
}

export function textNode(tag, text, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = String(text || "");
  return node;
}

export function list(id, values, fallback) {
  const items = Array.isArray(values) && values.length ? values : [fallback];
  replace(el(id), items.map((value) => textNode("li", typeof value === "string" ? value : value.label || value.host || "Not available")));
}

export function paragraphs(id, values) {
  replace(el(id), (values || []).map((value) => textNode("p", value)));
}

export function reveal(id) {
  document.body.classList.add("expandedView");
  const panel = el("advancedPanel");
  if (panel) panel.open = true;
  el(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}
