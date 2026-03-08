export interface BrowserLecture {
  key: string;
  id: string;
  text: string;
  textDe?: string;
  route?: string;
  detailRoute?: string;
  sourceUrl: string;
  sourceUrlDe?: string;
}

export interface BrowserNode {
  text: string;
  textDe?: string;
  path: string;
  route: string;
  lectures: BrowserLecture[];
  children: BrowserNode[];
}

export interface BrowserState {
  roots: BrowserNode[];
  breadcrumb: BrowserNode[];
  children: BrowserNode[];
  lectures: BrowserLecture[];
}

export function getBrowserState(nodes: BrowserNode[], selectedPath: string): BrowserState {
  if (!selectedPath) {
    return {
      roots: nodes,
      breadcrumb: [],
      children: [],
      lectures: []
    };
  }

  const breadcrumb = findBreadcrumb(nodes, selectedPath);
  const currentNode = breadcrumb.at(-1);

  return {
    roots: nodes,
    breadcrumb,
    children: currentNode?.children ?? [],
    lectures: currentNode?.lectures ?? []
  };
}

export function findPathByRoute(nodes: BrowserNode[], route: string): string | null {
  for (const node of nodes) {
    if (node.route === route) {
      return node.path;
    }
    const match = findPathByRoute(node.children, route);
    if (match) {
      return match;
    }
  }

  return null;
}

export function findNodeByRoute(nodes: BrowserNode[], route: string): BrowserNode | null {
  for (const node of nodes) {
    if (node.route === route) {
      return node;
    }
    const match = findNodeByRoute(node.children, route);
    if (match) {
      return match;
    }
  }

  return null;
}

function findBreadcrumb(nodes: BrowserNode[], selectedPath: string): BrowserNode[] {
  for (const node of nodes) {
    if (node.path === selectedPath) {
      return [node];
    }

    const nested = findBreadcrumb(node.children, selectedPath);
    if (nested.length > 0) {
      return [node, ...nested];
    }
  }

  return [];
}
