import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView; Terminal.jsx calls it directly
// (not through rAF) on the bottom-anchor ref for auto-follow scrolling.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
