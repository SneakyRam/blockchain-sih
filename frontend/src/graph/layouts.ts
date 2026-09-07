import { type LayoutOptions } from 'cytoscape';

export type LayoutName = 'cose' | 'concentric' | 'breadthfirst' | 'grid' | 'circle';

export const graphLayouts: Record<LayoutName, LayoutOptions> = {
  cose: {
    name: 'cose',
    animate: true,
    animationDuration: 300,
    padding: 30,
    idealEdgeLength: (edge) => 100,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: (node) => 400000,
    edgeElasticity: (edge) => 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  } as LayoutOptions,
  
  concentric: {
    name: 'concentric',
    animate: true,
    animationDuration: 300,
    padding: 30,
    startAngle: 3 / 2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    equidistant: false,
    minNodeSpacing: 50,
    boundingBox: undefined,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: false,
  } as LayoutOptions,

  breadthfirst: {
    name: 'breadthfirst',
    directed: true,
    padding: 30,
    animate: true,
    animationDuration: 300,
    spacingFactor: 1.2,
    boundingBox: undefined,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: false,
  } as LayoutOptions,

  grid: {
    name: 'grid',
    padding: 30,
    animate: true,
    animationDuration: 300,
  } as LayoutOptions,

  circle: {
    name: 'circle',
    padding: 30,
    animate: true,
    animationDuration: 300,
  } as LayoutOptions,
};
