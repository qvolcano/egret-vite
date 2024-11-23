import { AStar } from "./AStar";

/**
 * 六边形网格地图视图类
 * 实现了六边形网格的绘制、交互和寻路功能
 */
export class MapView extends egret.Sprite {
    private mapContainer: egret.Sprite;                        // 地图容器
    private readonly HEX_SIZE = 50;                           // 六边形大小（从中心到顶点的距离）
    private readonly MAP_SIZE = 100;                            // 地图尺寸（8x8网格）
    private obstacles: string[] = [];                         // 障碍物位置数组，使用"x,y"格式存储
    private startPos: {x: number, y: number} | null = null;   // 起点位置
    private endPos: {x: number, y: number} | null = null;     // 终点位置
    private grids: { [key: string]: egret.Shape } = {};       // 存储所有格子的引用，key为"x,y"格式

    constructor() {
        super();
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);
    }

    /**
     * 组件添加到舞台时的处理函数
     * 初始化障碍物和地图
     */
    private onAddToStage(): void {
        this.generateObstacles();
        this.initMap();
    }

    /**
     * 随机生成3-5个障碍物
     * 确保障碍物位置不重复
     */
    private generateObstacles(): void {
        let obstacleCount = Math.floor(Math.random() * 100) + 600;  // 生成3-5的随机数
        
        while (this.obstacles.length < obstacleCount) {
            let col = Math.floor(Math.random() * this.MAP_SIZE);
            let row = Math.floor(Math.random() * this.MAP_SIZE);
            let x = col;
            let y = row;
            let position = `${x},${y}`;
            
            if (this.obstacles.indexOf(position) === -1) {
                this.obstacles.push(position);
            }
        }
    }

    /**
     * 检查指定位置是否是障碍物
     * @param position 位置字符串，格式为"x,y"
     */
    private isObstacle(position: string): boolean {
        return this.obstacles.indexOf(position) !== -1;
    }

    /**
     * 初始化地图
     * 创建六边形网格、添加坐标文本、设置点击事件
     */
    private initMap(): void {
        this.mapContainer = new egret.Sprite();
        this.addChild(this.mapContainer);

        // 计算六边形的尺寸和偏移量
        let hexWidth = this.HEX_SIZE * Math.sqrt(3);  // 六边形宽度
        let hexHeight = this.HEX_SIZE * 2;            // 六边形高度
        let colOffset = hexWidth;                      // 列偏移量
        let rowOffset = hexHeight * 3/4;              // 行偏移量（压缩到3/4以实现无缝拼接）

        // 创建网格
        for (let row = 0; row < this.MAP_SIZE; row++) {
            for (let col = 0; col < this.MAP_SIZE; col++) {
                let container = new egret.Sprite();
                let x = col;
                let y = row;
                let position = `${x},${y}`;

                // 创建并绘制六边形
                let grid = new egret.Shape();
                this.drawHexagon(grid, this.isObstacle(position) ? 0xFF0000 : 0xFFFFFF);
                container.addChild(grid);

                // 创建并设置坐标文本
                // let coordText = new egret.TextField();
                // coordText.text = `${x},${y}`;
                // coordText.size = 12;
                // coordText.textColor = 0x000000;
                // coordText.textAlign = "center";
                // coordText.verticalAlign = "middle";
                // coordText.width = hexWidth;
                // coordText.height = hexHeight;
                // coordText.x = -hexWidth/2;   // 将文本居中
                // coordText.y = -hexHeight/2;
                
                // container.addChild(coordText);

                // 设置六边形位置（奇数行向右偏���半个宽度）
                container.x = col * colOffset + (row % 2 ? colOffset / 2 : 0);
                container.y = row * rowOffset;

                this.grids[position] = grid;

                // 为非障碍物格子添加点击事件
                if (!this.isObstacle(position)) {
                    container.touchEnabled = true;
                    container.addEventListener(
                        egret.TouchEvent.TOUCH_TAP, 
                        this.createClickHandler(x, y),
                        this
                    );
                }

                this.mapContainer.addChild(container);
            }
        }

        // 调整地图整体位置使其居中显示
        let mapWidth = (this.MAP_SIZE + 0.5) * colOffset;
        let mapHeight = (this.MAP_SIZE - 0.25) * rowOffset;
        
        this.mapContainer.x = (this.stage.stageWidth - mapWidth) / 2;
        this.mapContainer.y = (this.stage.stageHeight - mapHeight) / 2;
    }

    /**
     * 创建格子点击事件处理器
     * 使用闭包保存格子的坐标信息
     * 
     * @param x 格子的x坐标
     * @param y 格子的y坐标
     * @returns 点击事件处理函数
     */
    private createClickHandler(x: number, y: number): () => void {
        return () => this.onGridClick(x, y);
    }

    /**
     * 绘制六边形
     * 使用六个顶点绘制一个正六边形，顶点朝上
     * 
     * @param shape 要绘制的Shape对象
     * @param color 填充颜色（十六进制）
     *              - 0xFFFFFF: 白色（普通格子）
     *              - 0xFF0000: 红色（障碍物）
     *              - 0x00FF00: 绿色（起点）
     *              - 0xFF00FF: 粉色（终点）
     *              - 0x0000FF: 蓝色（路径）
     */
    private drawHexagon(shape: egret.Shape, color: number): void {
        shape.graphics.clear();                    // 清除之前的绘制内容
        shape.graphics.lineStyle(1, 0x000000);     // 设置1像素黑色边框
        shape.graphics.beginFill(color);           // 开始填充颜色

        let points = this.calculateHexPoints();    // 计算六边形的顶点
        shape.graphics.moveTo(points[0].x, points[0].y);  // 移动到第一个顶点
        
        // 依次连接所有顶点
        for (let i = 1; i < points.length; i++) {
            shape.graphics.lineTo(points[i].x, points[i].y);
        }
        
        // 连接回起点，完成闭合
        shape.graphics.lineTo(points[0].x, points[0].y);
        shape.graphics.endFill();
    }

    /**
     * 计算六边形的顶点坐标
     * 从30度开始，每60度一个顶点，共6个顶点
     * 使用三角函数计算每个顶点的相对坐标
     * 
     * @returns 包含六个顶点坐标的数组
     */
    private calculateHexPoints(): {x: number, y: number}[] {
        let points = [];
        for (let i = 0; i < 6; i++) {
            let angle = (i * 60 + 30) * Math.PI / 180;  // 转换角度为弧度
            points.push({
                x: this.HEX_SIZE * Math.cos(angle),     // 计算x坐标
                y: this.HEX_SIZE * Math.sin(angle)      // 计算y坐标
            });
        }
        return points;
    }

    /**
     * 处理格子点击事件
     * 实现起点、终点的选择和路径查找
     * 
     * @param x 被点击格子的x坐标
     * @param y 被点击格子的y坐标
     */
    private onGridClick(x: number, y: number): void {
        let position = `${x},${y}`;
        
        // 如果已经有起点和终点，重置地图
        if (this.startPos && this.endPos) {
            this.resetMap();
        }
        
        if (!this.startPos) {
            // 设置起点
            this.startPos = { x, y };
            this.drawHexagon(this.grids[position], 0x00FF00);  // 绿色表示起点
        } else if (!this.endPos) {
            // 设置终点并开始寻路
            this.endPos = { x, y };
            this.drawHexagon(this.grids[position], 0xFF00FF);  // 粉色表示终点
            this.findPath();
        }
    }

    /**
     * 执行A星寻路算法并绘制路径
     * 使用AStar类查找最短路径，并用蓝色标记路径
     */
    private findPath(): void {
        if (!this.startPos || !this.endPos) return;
        
        const astar = new AStar(this.MAP_SIZE, this.obstacles);
        console.time()
        const path = astar.findPath(this.startPos, this.endPos);
        console.timeEnd()
        
        // 如果找到路径，绘制路径（跳过起点和终点）
        if (path && path.length > 2) {
            for (let i = 1; i < path.length - 1; i++) {
                const node = path[i];
                const position = `${node.x},${node.y}`;
                this.drawHexagon(this.grids[position], 0x0000FF);  // 蓝色表示路径
            }
        }
    }

    /**
     * 重置地图状态
     * 清除起点、终点和路径，恢复所有非障碍格子为白色
     */
    private resetMap(): void {
        for (let row = 0; row < this.MAP_SIZE; row++) {
            for (let col = 0; col < this.MAP_SIZE; col++) {
                let x = col;
                let y = row;
                let position = `${x},${y}`;
                if (!this.isObstacle(position)) {
                    this.drawHexagon(this.grids[position], 0xFFFFFF);  // 白色表示普通格子
                }
            }
        }
        this.startPos = null;
        this.endPos = null;
    }
}