export interface PathNode {
    x: number;      // 地图块的x坐标
    y: number;      // 地图块的y坐标
    g: number;      // 从起点到当前节点的实际代价
    h: number;      // 从当前节点到终点的估计代价
    f: number;      // 总代价 f = g + h
    parent: PathNode | null;
} 