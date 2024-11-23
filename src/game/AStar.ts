import { PathNode } from "./interfaces/PathNode";
import { SimpleMap } from "./utils/SimpleMap";
import { SimpleSet } from "./utils/SimpleSet";

/**
 * A星寻路算法实现类
 * 专门用于六边形网格的寻路算法
 * 
 * 核心概念：
 * - g值：从起点到当前节点的实际代价
 * - h值：从当前节点到终点的估计代价（启发式值）
 * - f值：总代价（f = g + h）
 * 
 * 数据结构：
 * - openList: 待检查的节点列表
 * - closedSet: 已检查的节点集合
 * - openSet: 用于快速查找开放列表中的节点
 * 
 * 算法步骤：
 * 1. 将起点加入开放列表
 * 2. 重复以下步骤直到找到终点或开放列表为空：
 *    a. 从开放列表中选择f值最小的节点作为当前节点
 *    b. 将当前节点移到关闭列表
 *    c. 检查当前节点的所有相邻节点
 *    d. 对每个相邻节点计算新的g值，如果更优则更新路径
 * 3. 找到终点后，通过parent指针回溯构建路径
 */
export class AStar {
    private readonly mapSize: number;                          // 地图尺寸
    private readonly obstacles: SimpleSet<string>;             // 使用SimpleSet存储障碍物位置
    private endPos: {x: number, y: number};                   // 终点位置（用于计算启发式值）

    /**
     * 六边形网格的相邻方向
     * 奇数行和偶数行的相邻方向不同，需要分别定义
     * 
     * 奇数行的六个方向：
     *   ___     ___
     *  /   \___/   \
     *  \___/   \___/
     *  /   \___/   \
     *  \___/   \___/
     * 
     * 相对于中心点的偏移：
     * - 上    (0, -1)  正上方
     * - 右上  (1, -1)  右上角
     * - 右    (1,  0)  正右方
     * - 右下  (1,  1)  右下角
     * - 下    (0,  1)  正下方
     * - 左    (-1, 0)  正左方
     */
    private readonly oddRowDirections: {x: number, y: number}[] = [
        {x: 0, y: -1},   // 上
        {x: 1, y: -1},   // 右上
        {x: 1, y: 0},    // 右
        {x: 1, y: 1},    // 右下
        {x: 0, y: 1},    // 下
        {x: -1, y: 0}    // 左
    ];

    /**
     * 偶数行的六个方向
     * 与奇数行相比，x坐标的偏移不同
     * 
     * 偶数行的六个方向：
     *   ___     ___
     *  /   \___/   \
     *  \___/   \___/
     *  /   \___/   \
     *  \___/   \___/
     * 
     * 相对于中心点的偏移：
     * - 左上  (-1, -1)  左上角
     * - 上    (0, -1)   正上方
     * - 右    (1,  0)   正右方
     * - 下    (0,  1)   正下方
     * - 左下  (-1, 1)   左下角
     * - 左    (-1, 0)   正左方
     * 
     * 偶数行的特点：
     * 1. 整体向左偏移半个六边形宽度
     * 2. 上下相邻的六边形在x轴上错开
     * 3. 与奇数行形成交错排列，实现无缝拼接
     */
    private readonly evenRowDirections: {x: number, y: number}[] = [
        {x: -1, y: -1},  // 左上
        {x: 0, y: -1},   // 上
        {x: 1, y: 0},    // 右
        {x: 0, y: 1},    // 下
        {x: -1, y: 1},   // 左下
        {x: -1, y: 0}    // 左
    ];

    /**
     * 构造函数
     * 初始化A星寻路算法所需的基本参数
     * 
     * @param mapSize 地图大小（正方形地图的边长）
     * @param obstacles 障碍物位置列表（可选参数）
     * @throws Error 当地图尺寸小于等于0时抛出异常
     * 
     * 注意：
     * - 地图坐标从0开始，范围是[0, mapSize-1]
     * - 障碍物位置使用"x,y"格式的字符串表示
     */
    constructor(mapSize: number, obstacles?: string[]) {
        if (mapSize <= 0) {
            throw new Error('地图尺寸必须大于0');
        }
        this.mapSize = mapSize;
        this.obstacles = new SimpleSet<string>(obstacles);
    }

    /**
     * A星寻路的主要方法
     * 实现了A*算法的核心逻辑
     */
    public findPath(start: {x: number, y: number}, end: {x: number, y: number}): PathNode[] | null {
        // 验证起点坐标是否在地图范围内
        if (!this.isValidCoordinate(start.x, start.y)) {
            throw new Error('起点坐标无效');
        }
        // 验证终点坐标是否在地图范围内
        if (!this.isValidCoordinate(end.x, end.y)) {
            throw new Error('终点坐标无效');
        }

        // 生成起点和终点的位置键
        const startKey = `${start.x},${start.y}`;
        const endKey = `${end.x},${end.y}`;

        // 检查起点是否是障碍物
        if (this.obstacles.has(startKey)) {
            throw new Error('起点不能是障碍物');
        }
        // 检查终点是否是障碍物
        if (this.obstacles.has(endKey)) {
            throw new Error('终点不能是障碍物');
        }

        // 保存终点位置用于计算启发式值
        this.endPos = end;

        // 初始化开放列表（待检查的节点）
        const openList: PathNode[] = [];
        // 初始化关闭集合（已检查的节点）
        const closedSet = new SimpleSet<string>();
        // 初始化开放集合（用于快速查找）
        const openSet = new SimpleMap<string, PathNode>();
        
        // 创建起点节点
        const startNode: PathNode = {
            x: start.x,
            y: start.y,
            g: 0,                                             // 起点的g值为0
            h: this.calculateHeuristic(start.x, start.y),     // 计算到终点的估计代价
            f: 0,                                             // f值稍后计算
            parent: null                                      // 起点没有父节点
        };
        // 计算起点的f值（f = g + h）
        startNode.f = startNode.g + startNode.h;
        
        // 将起点加入开放列表和开放集合
        openList.push(startNode);
        openSet.set(startKey, startNode);

        // 主循环：当开放列表不为空时继续搜索
        while (openList.length > 0) {
            // 获取f值最小的节点作为当前节点
            const currentNode = this.getMinFNode(openList);
            // 生成当前节点的位置键
            const currentKey = `${currentNode.x},${currentNode.y}`;
            
            // 如果当前节点是终点，说明找到了路径
            if (currentNode.x === end.x && currentNode.y === end.y) {
                // 从终点回溯构建完整路径并返回
                return this.buildPath(currentNode);
            }

            // 将当前节点从开放列表和开放集合中移除
            this.removeFromOpenList(openList, currentNode);
            openSet.delete(currentKey);
            // 将当前节点加入关闭集合
            closedSet.add(currentKey);

            // 获取当前节点的所有相邻节点
            const neighbors = this.getNeighbors(currentNode);
            // 遍历所有相邻节点
            for (const neighbor of neighbors) {
                // 生成相邻节点的位置键
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                // 如果相邻节点已经在关闭集合中，跳过
                if (closedSet.has(neighborKey)) continue;

                // 计算经过当前节点到达相邻节点的代价
                const gScore = currentNode.g + 1;  // 假设每步代价为1
                // 查找相邻节点是否已在开放集合中
                const existingNode = openSet.get(neighborKey);

                if (!existingNode) {
                    // 如果节点不在开放集合中，这是一个新节点
                    neighbor.g = gScore;
                    neighbor.h = this.calculateHeuristic(neighbor.x, neighbor.y);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                    // 将新节点加入开放列表和开放集合
                    openList.push(neighbor);
                    openSet.set(neighborKey, neighbor);
                } else if (gScore < existingNode.g) {
                    // 如果找到更好的路径（更小的g值）
                    existingNode.g = gScore;
                    existingNode.f = gScore + existingNode.h;
                    existingNode.parent = currentNode;
                }
            }
        }

        // 开放列表为空但没有找到终点，说明不存在可行路径
        return null;
    }

    /**
     * 计算启发式值（估计到终点的代价）
     * 使用改进的曼哈顿距离，考虑六边形网格的特性
     * 
     * @param x 当前节点的x坐标
     * @param y 当前节点的y坐标
     * @returns 估计的代价值
     * 
     * 计算公式：
     * - dx = 当前节点与终点的x轴距离
     * - dy = 当前节点与终点的y轴距离
     * - 启发式值 = max(dx, dy) + min(dx, dy)/2
     * 
     * 特点：
     * 1. 不会高估实际代价（满足A*的要求）
     * 2. 考虑了六边形网格中斜向移动的特性
     * 3. 保证了路径的最优性
     */
    private calculateHeuristic(x: number, y: number): number {
        const dx = Math.abs(x - this.endPos.x);
        const dy = Math.abs(y - this.endPos.y);
        // 使用最大值加上最小值的一半作为估计值
        // 这个公式考虑了六边形网格中斜向移动的特性
        return Math.max(dx, dy) + Math.min(dx, dy) / 2;
    }

    /**
     * 获取指定节点的所有相邻节点
     * 根据节点所在行的奇偶性选择不同的方向数组
     * 
     * @param node 当前节点
     * @returns 可到达的相邻节点数组
     * 
     * 处理步骤：
     * 1. 根据节点y坐标的奇偶性选择方向数组
     * 2. 计算每个方向上相邻节点的坐标
     * 3. 验证新坐标的有效性
     * 4. 创建并返回有效的相邻节点
     */
    private getNeighbors(node: PathNode): PathNode[] {
        // 创建存储相邻节点的数组
        const neighbors: PathNode[] = [];

        // 根据当前节点所在行的奇偶性选择对应的方向数组
        // node.y % 2 为1表示奇数行，为0表示偶数行
        const directions = node.y % 2 ? this.oddRowDirections : this.evenRowDirections;
        
        // 遍历所有可能的方向
        for (const dir of directions) {
            // 计算在当前方向上新节点的x坐标
            const newX = node.x + dir.x;
            // 计算在当前方向上新节点的y坐标
            const newY = node.y + dir.y;

            // 检查新坐标是否有效（在地图范围内且不是障碍物）
            if (this.isValidPosition(newX, newY)) {
                // 创建新的相邻节点
                neighbors.push({
                    x: newX,          // 设置x坐标
                    y: newY,          // 设置y坐标
                    g: 0,             // g值初始化为0，后续会更新
                    h: 0,             // h值初始化为0，后续会更新
                    f: 0,             // f值初始化为0，后续会更新
                    parent: null      // parent初始化为null，后续会设置为当前节点
                });
            }
        }
        
        // 返回所有有效的相邻节点
        return neighbors;
    }

    /**
     * 检查坐标是否在地图范围内
     * 
     * @param x x坐标
     * @param y y坐标
     * @returns 坐标是否有效
     * 
     * 验证条件：
     * 1. x坐标在[0, mapSize-1]范围内
     * 2. y坐标在[0, mapSize-1]范围内
     */
    private isValidCoordinate(x: number, y: number): boolean {
        return x >= 0 && x < this.mapSize && y >= 0 && y < this.mapSize;
    }

    /**
     * 检查位置是否有效（在地图内且不是障碍物）
     * 
     * @param x x坐标
     * @param y y坐标
     * @returns 位置是否可通行
     * 
     * 检查步骤：
     * 1. 验证坐标是否在地图范围内
     * 2. 检查该位置是否是障碍物
     */
    private isValidPosition(x: number, y: number): boolean {
        return this.isValidCoordinate(x, y) && !this.obstacles.has(`${x},${y}`);
    }

    /**
     * 从开放列表中获取F值最小的节点
     * 
     * @param list 开放列表
     * @returns F值最小的节点
     * 
     * 实现说明：
     * 1. 从列表第一个节点开始
     * 2. 遍历列表找到F值最小的节点
     * 3. F值相等时，保留先进入列表的节点
     */
    private getMinFNode(list: PathNode[]): PathNode {
        let minNode = list[0];
        for (let i = 1; i < list.length; i++) {
            if (list[i].f < minNode.f) {
                minNode = list[i];
            }
        }
        return minNode;
    }

    /**
     * 从开放列表中移除指定节点
     * 
     * @param openList 开放列表
     * @param node 要移除的节点
     * 
     * 实现说明：
     * 1. 遍历列表查找匹配的节点
     * 2. 使用splice方法移除找到的节点
     * 3. 找到后立即退出循环
     */
    private removeFromOpenList(openList: PathNode[], node: PathNode): void {
        for (let i = 0; i < openList.length; i++) {
            if (openList[i].x === node.x && openList[i].y === node.y) {
                openList.splice(i, 1);
                break;
            }
        }
    }

    /**
     * 从终点回溯构建完整路径
     * 
     * @param endNode 终点节点
     * @returns 完整的路径节点数组（从起点到终点）
     * 
     * 实现步骤：
     * 1. 创建空的路径数组
     * 2. 从终点节点开始
     * 3. 通过parent指针不断回溯
     * 4. 将每个节点插入到数组开头
     * 5. 直到到达起点（parent为null）
     * 
     * 注意：
     * - 返回的路径包含起点和终点
     * - 路径按从起点到终点的顺序排列
     */
    private buildPath(endNode: PathNode): PathNode[] {
        const path: PathNode[] = [];
        let current: PathNode | null = endNode;
        
        while (current) {
            path.unshift(current);
            current = current.parent;
        }
        
        return path;
    }
} 