class MapNode {
  nodes: MapNode[] = []
  pos: number
  x: number
  y: number
  v: number
  prev: MapNode
  cost: number = 0
  c: number = 0
  token: number = 0
  constructor(x, y, v) {
    this.x = x
    this.y = y
    this.v = v
  }
}
export class Main extends egret.DisplayObjectContainer {
  bm: egret.Bitmap
  map_node
  map_data
  $onAddToStage(stage: egret.Stage, nestLevel: number): void {
    super.$onAddToStage(stage, nestLevel)
    this.createGameScene()
  }
  protected async createGameScene() {
    let w = 50
    let h = 50
    let map_data = this.createMap(w, h)
    map_data[0] = 0
    map_data[240] = 0
    let map_node: MapNode[] = this.createNodes(w, h, map_data)

    //draw
    let shape = new egret.Sprite()
    for (let i = 0; i < map_data.length; i++) {
      if (map_data[i] == 1) {
        this.drawNode(shape, 0, map_node[i].x, map_node[i].y)
      }
    }
    this.addChild(shape)

    shape.scaleX = shape.scaleY = 0.25
    let debug_shape = new egret.Sprite()
    debug_shape.scaleX = debug_shape.scaleY = 0.25
    this.addChild(debug_shape)
    this.map_data = map_data
    this.map_node = map_node
    let start = map_node[240]
    let end = map_node[0]
    console.time()
    let path = await this.search(start, end, debug_shape)
    console.timeEnd()
    for (let i of path) {
      this.drawNode(debug_shape, 0xff0000, i.x, i.y)
    }
  }

  search_token = 1


  private drawNode(shape: egret.Sprite, color: number, x: number, y: number) {
    let w = 50
    let h = 50
    let sx = ((Math.sqrt(3) / 2) * w) * x + (y % 2 == 0 ? w : w * .5)
    let sy = y * w + (w * .5) - w * .25 * y
    shape.graphics.beginFill(color)
    // shape.graphics.lineStyle(0.1, 0xffffff)
    shape.graphics.moveTo(sx, sy - h * .5)
    for (let i = 0; i < 7; i++) {
      shape.graphics.lineTo(sx + Math.sin(Math.PI * (60 / 180) * i) * (w * .5), sy + Math.cos(Math.PI * (60 / 180) * i) * (w * .5))
    }
    shape.graphics.endFill()
  }
  private async search(start: MapNode, end: MapNode, debug: egret.Sprite) {
    let end_x = end.x
    let end_y = end.y
    let base_cost = this.get_cost(start.x, start.y, end.x, end.y)
    let opens = [[start], [], [], []]
    let cur: MapNode
    let searched = []
    while (true) {
    //   await this.draw_debug(debug, opens, start, end, searched)
      if (opens[0].length == 0 && opens[1].length == 0 && opens[2].length == 0 && opens[3].length == 0) {
        return null
      } else {
        cur = opens[0].pop()
        if (cur) {
          searched.push(cur)
          if (cur == end) {
            let path = [cur];
            while (cur.prev && cur.prev != start) {
              path.push(cur = cur.prev)
            }
            return path
          } else {
            for (let i of cur.nodes) {
              if (this.search_token > i.token) {
                i.token = this.search_token
                i.cost = cur.cost + 1
                i.prev = cur
                opens[this.get_cost(i.x, i.y, end_x, end_y) + i.cost - base_cost].push(i)
              }
            }
          }
        } else {
          if (opens[0].length == 0) {
            base_cost++
            opens.shift()
            opens.push([])
          }
        }
      }
    }
  }

  private async draw_debug(debug: egret.Sprite, opens: MapNode[][], start: MapNode, end: MapNode, searched: MapNode[]) {
    return new Promise(resolve => {
      if (debug.graphics['node'] == null) {
        debug.graphics["node"] = []
      }
      debug.graphics.clear()
      this.drawNode(debug, 0xff0000, start.x, start.y)
      this.drawNode(debug, 0x00ff00, end.x, end.y)
      for (let i of debug.graphics["node"]) {
        this.drawNode(debug, 0xffeeff, i.x, i.y)
      }
      // for (let i of opens[0]) {
      //   this.drawNode(debug, 0xffeeff, i.x, i.y)
      //   debug.graphics["node"].push(i)
      // }
      for (let i of opens[1]) {
        this.drawNode(debug, 0x992299, i.x, i.y)
      }
      for (let i of opens[2]) {
        this.drawNode(debug, 0x992299, i.x, i.y)
      }
      for (let i of searched) {
        this.drawNode(debug, 0x992299, i.x, i.y)
      }
      setTimeout(resolve, 10)
    })
  }

  private get_cost(start_x, start_y, end_x, end_y) {
    return Math.abs(end_x - start_x) + Math.abs(end_y - start_y)
  }

  private createMap(w: number, h: number) {
    let map_data = [];
    for (let i = 0; i < w * h; i++) {
      map_data[i] = Math.random() > .7
    }
    return map_data
  }

  private idx_to_pos_x(idx, w, h) {
    return idx % w >> 0
  }
  private idx_to_pos_y(idx, w, h) {
    return idx / w >> 0
  }

  private pos_to_idx(x, y, w, h) {
    return x + y * w
  }

  private createNodes(w: number, h: number, data: number[]) {
    let r: MapNode[] = []
    for (let i = 0; i < data.length; i++) {
      r[i] = new MapNode(i % w, i / w >> 0, data[i])
    }
    for (let i = 0; i < r.length; i++) {
      let x = this.idx_to_pos_x(i, w, h)
      let y = this.idx_to_pos_y(i, w, h)
      if (x > 0) {
        let left = this.pos_to_idx(x - 1, y, w, h)
        data[left] == 0 && r[i].nodes.push(r[left])
      }
      if(x<w-1){
        let right = this.pos_to_idx(x+1,y,w,h)
          data[right]==0 && r[i].nodes.push(r[right])
      }
      if(y>0){
        let up = this.pos_to_idx(x,y-1,w,h)
        data[up] == 0 && r[i].nodes.push(r[up])

        if(x<w-1){
          let up_right = this.pos_to_idx(x+1,y-1,w,h)
          data[up_right]==0&&r[i].nodes.push(r[up_right])
        }
      }
      if(y<h-1){
        let down = this.pos_to_idx(x,y+1,w,h)
        data[down] == 0 &&r[i].nodes.push(r[down])

        if(x<w-1){
          let down_right = this.pos_to_idx(x+1,y+1,w,h)
          data[down_right]==0&&r[i].nodes.push(r[down_right])
        }
      }

    }
    return r
  }
}
window["Main"] = Main