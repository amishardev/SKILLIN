/**
 * Prerequisite engine.
 *
 * Skills form a directed graph: an edge A -> B means "A should be learned
 * before B". The graph is assembled from two sources, the taxonomy's own
 * declarations, and the prerequisite lists on learning resources, so adding a
 * resource automatically enriches the ordering.
 *
 * Ordering uses Kahn's algorithm. Real curricula occasionally contain cycles
 * (two resources each listing the other's skill), so cycles are detected and
 * broken deterministically rather than causing an infinite loop or a crash.
 */

import { SKILLS, skillName } from '@/data/skills';
import { RESOURCES, type LearningResource } from '@/data/resources';
import { PREREQ_READY_THRESHOLD } from './config';
import type { SkillVector } from '@/types';

export interface PrerequisiteGraph {
  /** skillId -> skills that must come first. */
  dependencies: Map<string, Set<string>>;
  /** skillId -> skills unlocked by learning it. */
  dependents: Map<string, Set<string>>;
}

/** Build the graph once; it is derived purely from static data. */
export function buildPrerequisiteGraph(
  resources: readonly LearningResource[] = RESOURCES): PrerequisiteGraph {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  /** Can `to` already be reached from `from` by following dependents? */
  const reachable = (from: string, to: string): boolean => {
    if (from === to) return true;
    const seen = new Set<string>([from]);
    const stack = [from];
    while (stack.length > 0) {
      const node = stack.pop()!;
      for (const next of dependents.get(node) ?? []) {
        if (next === to) return true;
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    return false;
  };

  const addEdge = (before: string, after: string) => {
    if (before === after) return;
    // Keep the graph acyclic by construction. Catalog data occasionally implies
    // both "A before B" and "B before A", for instance one resource teaching
    // React while assuming JavaScript, and another doing the reverse. The first
    // edge seen wins, which is why taxonomy edges are added before resource
    // edges: the taxonomy is the more authoritative source of ordering.
    if (reachable(after, before)) return;

    if (!dependencies.has(after)) dependencies.set(after, new Set());
    if (!dependents.has(before)) dependents.set(before, new Set());
    dependencies.get(after)!.add(before);
    dependents.get(before)!.add(after);
  };

  for (const skill of SKILLS) {
    for (const prereq of skill.prerequisites ?? []) addEdge(prereq, skill.id);
  }

  for (const resource of resources) {
    for (const taught of resource.skills) {
      // A skill listed as both taught and assumed is a data error, not an edge.
      if (resource.prerequisites.includes(taught)) continue;
      for (const prereq of resource.prerequisites) addEdge(prereq, taught);
    }
  }

  return { dependencies, dependents };
}

/** Memoised default graph, the static catalog does not change at runtime. */
let defaultGraph: PrerequisiteGraph | null = null;
export function getPrerequisiteGraph(): PrerequisiteGraph {
  defaultGraph ??= buildPrerequisiteGraph();
  return defaultGraph;
}

/** Direct prerequisites of a skill. */
export function directPrerequisites(skillId: string, graph = getPrerequisiteGraph()): string[] {
  return [...(graph.dependencies.get(skillId) ?? [])];
}

/** Everything a skill unlocks, one hop out. */
export function unlockedBy(skillId: string, graph = getPrerequisiteGraph()): string[] {
  return [...(graph.dependents.get(skillId) ?? [])];
}

/**
 * All transitive prerequisites of a skill.
 * Visited-set guarded, so a cycle terminates instead of recursing forever.
 */
export function allPrerequisites(skillId: string, graph = getPrerequisiteGraph()): Set<string> {
  const seen = new Set<string>();
  const stack = [...(graph.dependencies.get(skillId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const parent of graph.dependencies.get(current) ?? []) {
      if (!seen.has(parent)) stack.push(parent);
    }
  }
  return seen;
}

export interface ReadinessResult {
  ready: boolean;
  /** Canonical ids of prerequisites the learner has not reached yet. */
  missing: string[];
  /** Display names, for UI. */
  missingNames: string[];
}

/**
 * Is the learner ready to start this resource?
 *
 * A prerequisite blocks only when the learner is genuinely below the threshold.
 */
export function checkReadiness(
  prerequisites: readonly string[],
  vector: SkillVector,
  threshold = PREREQ_READY_THRESHOLD): ReadinessResult {
  const missing = prerequisites.filter((p) => (vector.get(p) ?? 0) < threshold);
  return {
    ready: missing.length === 0,
    missing,
    missingNames: missing.map(skillName),
  };
}

/**
 * Detect cycles using an iterative DFS with colouring.
 * Returns each cycle found, as a list of skill ids.
 */
export function findCycles(graph = getPrerequisiteGraph()): string[][] {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  const cycles: string[][] = [];

  const nodes = new Set<string>([...graph.dependencies.keys(), ...graph.dependents.keys()]);
  for (const node of nodes) colour.set(node, WHITE);

  for (const start of nodes) {
    if (colour.get(start) !== WHITE) continue;

    const path: string[] = [];
    const stack: Array<{ node: string; childIndex: number }> = [{ node: start, childIndex: 0 }];
    colour.set(start, GREY);
    path.push(start);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = [...(graph.dependents.get(frame.node) ?? [])];

      if (frame.childIndex >= children.length) {
        colour.set(frame.node, BLACK);
        stack.pop();
        path.pop();
        continue;
      }

      const child = children[frame.childIndex++];
      const childColour = colour.get(child) ?? WHITE;

      if (childColour === GREY) {
        const from = path.indexOf(child);
        if (from >= 0) cycles.push(path.slice(from));
      } else if (childColour === WHITE) {
        colour.set(child, GREY);
        path.push(child);
        stack.push({ node: child, childIndex: 0 });
      }
    }
  }
  return cycles;
}

/**
 * Order a set of skills so prerequisites always come first (Kahn's algorithm).
 *
 * Only edges *within* the requested set are considered, ordering a five-skill
 * plan should not drag in the whole taxonomy. When a cycle leaves nodes with a
 * non-zero in-degree, the remainder is appended in a stable, deterministic
 * order rather than being dropped.
 */
export function topologicalOrder(
  skillIds: readonly string[],
  graph = getPrerequisiteGraph()): { ordered: string[]; brokenCycle: boolean } {
  const scope = new Set(skillIds);
  const inDegree = new Map<string, number>();
  const edges = new Map<string, Set<string>>();

  for (const id of scope) {
    inDegree.set(id, 0);
    edges.set(id, new Set());
  }

  for (const id of scope) {
    for (const prereq of graph.dependencies.get(id) ?? []) {
      if (!scope.has(prereq)) continue;
      if (!edges.get(prereq)!.has(id)) {
        edges.get(prereq)!.add(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    }
  }

  // Sorting the frontier keeps output stable across runs for equal-depth skills.
  const ready = [...scope].filter((id) => inDegree.get(id) === 0).sort();
  const ordered: string[] = [];

  while (ready.length > 0) {
    const node = ready.shift()!;
    ordered.push(node);
    const next: string[] = [];
    for (const child of edges.get(node) ?? []) {
      const degree = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, degree);
      if (degree === 0) next.push(child);
    }
    next.sort();
    ready.push(...next);
    ready.sort();
  }

  const brokenCycle = ordered.length < scope.size;
  if (brokenCycle) {
    // Append whatever the cycle held back, lowest remaining in-degree first.
    const remaining = [...scope]
      .filter((id) => !ordered.includes(id))
      .sort((a, b) => (inDegree.get(a) ?? 0) - (inDegree.get(b) ?? 0) || a.localeCompare(b));
    ordered.push(...remaining);
  }

  return { ordered, brokenCycle };
}

/**
 * How close is the learner to being able to start this resource?
 * 1 means fully ready; 0 means none of the prerequisites are present.
 * Used to rank *blocked* resources sensibly instead of treating them as equal.
 */
export function readinessScore(
  prerequisites: readonly string[],
  vector: SkillVector,
  threshold = PREREQ_READY_THRESHOLD): number {
  if (prerequisites.length === 0) return 1;
  let total = 0;
  for (const p of prerequisites) {
    total += Math.min(1, (vector.get(p) ?? 0) / threshold);
  }
  return total / prerequisites.length;
}
