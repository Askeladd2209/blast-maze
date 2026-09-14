export class Pathfinding {
    constructor(mapGenerator) {
        this.mapGenerator = mapGenerator;
    }

    isWalkable(x, y) {
        if (
            x < 0 ||
            x >= this.mapGenerator.width ||
            y < 0 ||
            y >= this.mapGenerator.height
        ) {
            return false;
        }

        const tile = this.mapGenerator.getTile(x, y);

        return tile === 0;
    }

    getNeighbors(x, y) {
    const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 }
    ];

    return neighbors.filter(
        cell => this.isWalkable(cell.x, cell.y)
    );

    }

    findPathBFS(startX, startY, targetX, targetY) {
    const queue = [
        {
            x: startX,
            y: startY,
            path: []
        }
    ];

    const visited = new Set();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.x === targetX && current.y === targetY) {
            return current.path;
        }

        const neighbors = this.getNeighbors(current.x, current.y);

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;

            if (visited.has(key)) {
                continue;
            }

            visited.add(key);

            queue.push({
                x: neighbor.x,
                y: neighbor.y,
                path: [
                    ...current.path,
                    {
                        x: neighbor.x,
                        y: neighbor.y
                    }
                ]
            });
        }
    }

    return [];
}

    heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
    findPathAStar(startX, startY, targetX, targetY) {
    const openSet = [
        {
            x: startX,
            y: startY,
            g: 0,
            h: this.heuristic(startX, startY, targetX, targetY),
            path: []
        }
    ];

    const visited = new Set();

    while (openSet.length > 0) {
    let bestIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
        const current = openSet[i];
        const best = openSet[bestIndex];

        const currentF = current.g + current.h;
        const bestF = best.g + best.h;

        if (currentF < bestF) {
            bestIndex = i;
        }
    }

    const current = openSet.splice(bestIndex, 1)[0];

    if (current.x === targetX && current.y === targetY) {
    return current.path;
    }
}
    const key = `${current.x},${current.y}`;
visited.add(key);

const neighbors = this.getNeighbors(current.x, current.y);

for (const neighbor of neighbors) {
    const neighborKey = `${neighbor.x},${neighbor.y}`;

if (visited.has(neighborKey)) {
    continue;
}

const newG = current.path.length + 1;

const h = this.heuristic(
    neighbor.x,
    neighbor.y,
    targetX,
    targetY
);

const f = newG + h;

openSet.push({
    x: neighbor.x,
    y: neighbor.y,
    g: newG,
    h: h,
    f: f,
    path: [...current.path, neighbor]
});
    
}

    return [];
}
}