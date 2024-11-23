class MapView2 extends eui.Component {
    private mapContainer: egret.Sprite;
    private readonly GRID_SIZE = 50; // 每个格子的大小
    private readonly MAP_SIZE = 8;   // 地图尺寸 8x8
    private obstacles: string[] = []; // 存储障碍点位置
    
    // 起点和终点
    private startPos: any = null;
    private endPos: any = null;
    
    // 存储所有格子的引用
    private grids: { [key: string]: egret.Shape } = {};
    
    public constructor() {
        super();
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);
    }

    private onAddToStage(): void {
        this.generateObstacles();
        this.initMap();
    }

    private generateObstacles(): void {
        // 随机生成3-5个障碍点
        const obstacleCount = Math.floor(Math.random() * 3) + 3; // 3到5的随机数
        
        while (this.obstacles.length < obstacleCount) {
            const row = Math.floor(Math.random() * this.MAP_SIZE);
            const col = Math.floor(Math.random() * this.MAP_SIZE);
            const position = row + "," + col;
            
            // 确保不重复添加同一位置
            if (this.obstacles.indexOf(position) === -1) {
                this.obstacles.push(position);
            }
        }
    }

    private isObstacle(position: string): boolean {
        return this.obstacles.indexOf(position) !== -1;
    }

    private initMap(): void {
        this.mapContainer = new egret.Sprite();
        this.addChild(this.mapContainer);

        for (var row = 0; row < this.MAP_SIZE; row++) {
            for (var col = 0; col < this.MAP_SIZE; col++) {
                var grid = new egret.Shape();
                var position = row + "," + col;
                
                if (this.isObstacle(position)) {
                    grid.graphics.beginFill(0xFF0000);
                } else {
                    grid.graphics.beginFill(0xFFFFFF);
                }
                
                grid.graphics.lineStyle(1, 0x000000);
                grid.graphics.drawRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
                grid.graphics.endFill();

                grid.x = col * this.GRID_SIZE;
                grid.y = row * this.GRID_SIZE;

                // 存储格子引用
                this.grids[position] = grid;

                if (!this.isObstacle(position)) {
                    grid.touchEnabled = true;
                    
                    // 修改点击事件，实现起点终点的选择
                    grid.addEventListener(egret.TouchEvent.TOUCH_TAP, function(row, col) {
                        return function() {
                            this.onGridClick(row, col);
                        }.bind(this);
                    }.bind(this)(row, col), this);
                }

                this.mapContainer.addChild(grid);
            }
        }

        this.mapContainer.x = (this.stage.stageWidth - this.MAP_SIZE * this.GRID_SIZE) / 2;
        this.mapContainer.y = (this.stage.stageHeight - this.MAP_SIZE * this.GRID_SIZE) / 2;
    }

    // 处理格子点击事件
    private onGridClick(row: number, col: number): void {
        var position = row + "," + col;
        
        // 如果已经有起点和终点，重置地图
        if (this.startPos && this.endPos) {
            this.resetMap();
        }
        
        if (!this.startPos) {
            // 设置起点
            this.startPos = { row: row, col: col };
            this.grids[position].graphics.clear();
            this.grids[position].graphics.beginFill(0x00FF00); // 绿色表示起点
            this.grids[position].graphics.lineStyle(1, 0x000000);
            this.grids[position].graphics.drawRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
            this.grids[position].graphics.endFill();
        } else if (!this.endPos) {
            // 设置终点
            this.endPos = { row: row, col: col };
            this.grids[position].graphics.clear();
            this.grids[position].graphics.beginFill(0xFF00FF); // 粉色表示终点
            this.grids[position].graphics.lineStyle(1, 0x000000);
            this.grids[position].graphics.drawRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
            this.grids[position].graphics.endFill();
            
            // 开始寻路
            this.findPath();
        }
    }

    // 添加重置地图方法
    private resetMap(): void {
        // 重置所有非障碍格子为白色
        for (var row = 0; row < this.MAP_SIZE; row++) {
            for (var col = 0; col < this.MAP_SIZE; col++) {
                var position = row + "," + col;
                if (!this.isObstacle(position)) {
                    var grid = this.grids[position];
                    grid.graphics.clear();
                    grid.graphics.beginFill(0xFFFFFF);
                    grid.graphics.lineStyle(1, 0x000000);
                    grid.graphics.drawRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
                    grid.graphics.endFill();
                }
            }
        }
        
        // 重置起点和终点
        this.startPos = null;
        this.endPos = null;
    }

    // A星寻路算法
    private findPath(): void {
        var openList = [];
        var closedList = [];
        var startNode = {
            row: this.startPos.row,
            col: this.startPos.col,
            g: 0,
            h: 0,
            f: 0,
            parent: null
        };
        
        // 计算启发式值（曼哈顿距离）
        startNode.h = Math.abs(this.endPos.row - startNode.row) + 
                     Math.abs(this.endPos.col - startNode.col);
        startNode.f = startNode.g + startNode.h;
        
        openList.push(startNode);

        while (openList.length > 0) {
            // 找到F值最小的节点
            var currentNode = this.getMinFNode(openList);
            
            // 到达终点
            if (currentNode.row === this.endPos.row && currentNode.col === this.endPos.col) {
                this.drawPath(currentNode);
                return;
            }

            // 从开放列表移除当前节点
            openList = openList.filter(function(node) {
                return !(node.row === currentNode.row && node.col === currentNode.col);
            });
            closedList.push(currentNode);

            // 检查相邻节点
            var neighbors = this.getNeighbors(currentNode);
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                
                // 检查是否已经在关闭列表中
                if (this.isInList(neighbor, closedList)) {
                    continue;
                }

                var gScore = currentNode.g + 1;
                var inOpenList = this.isInList(neighbor, openList);

                if (!inOpenList || gScore < neighbor.g) {
                    neighbor.g = gScore;
                    neighbor.h = Math.abs(this.endPos.row - neighbor.row) + 
                                Math.abs(this.endPos.col - neighbor.col);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;

                    if (!inOpenList) {
                        openList.push(neighbor);
                    }
                }
            }
        }
    }

    // 获取F值最小的节点
    private getMinFNode(list: any[]): any {
        var minNode = list[0];
        for (var i = 1; i < list.length; i++) {
            if (list[i].f < minNode.f) {
                minNode = list[i];
            }
        }
        return minNode;
    }

    // 获取相邻节点
    private getNeighbors(node: any): any[] {
        var neighbors = [];
        var directions = [
            {row: -1, col: 0},  // 上
            {row: 1, col: 0},   // 下
            {row: 0, col: -1},  // 左
            {row: 0, col: 1}    // 右
        ];

        for (var i = 0; i < directions.length; i++) {
            var newRow = node.row + directions[i].row;
            var newCol = node.col + directions[i].col;

            // 检查是否在地图范围内
            if (newRow >= 0 && newRow < this.MAP_SIZE && 
                newCol >= 0 && newCol < this.MAP_SIZE) {
                
                // 检查是否是障碍物
                if (!this.isObstacle(newRow + "," + newCol)) {
                    neighbors.push({
                        row: newRow,
                        col: newCol,
                        g: 0,
                        h: 0,
                        f: 0,
                        parent: null
                    });
                }
            }
        }
        return neighbors;
    }

    // 检查节点是否在列表中
    private isInList(node: any, list: any[]): boolean {
        return list.some(function(item) {
            return item.row === node.row && item.col === node.col;
        });
    }

    // 绘制路径
    private drawPath(endNode: any): void {
        var current = endNode;
        while (current.parent) {
            var position = current.row + "," + current.col;
            if (!this.isStartOrEnd(current.row, current.col)) {
                this.grids[position].graphics.clear();
                this.grids[position].graphics.beginFill(0x0000FF); // 蓝色表示路径
                this.grids[position].graphics.lineStyle(1, 0x000000);
                this.grids[position].graphics.drawRect(0, 0, this.GRID_SIZE, this.GRID_SIZE);
                this.grids[position].graphics.endFill();
            }
            current = current.parent;
        }
    }

    // 检查是否是起点或终点
    private isStartOrEnd(row: number, col: number): boolean {
        return (this.startPos && this.startPos.row === row && this.startPos.col === col) ||
               (this.endPos && this.endPos.row === row && this.endPos.col === col);
    }
}