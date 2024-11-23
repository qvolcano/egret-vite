/**
 * 简单的Map实现，用于ES5环境
 */
export class SimpleMap<K, V> {
    private items: { [key: string]: V } = {};
    private keyMap: { [key: string]: K } = {};

    set(key: K, value: V): void {
        const keyStr = JSON.stringify(key);
        this.items[keyStr] = value;
        this.keyMap[keyStr] = key;
    }

    get(key: K): V | undefined {
        const keyStr = JSON.stringify(key);
        return this.items[keyStr];
    }

    has(key: K): boolean {
        const keyStr = JSON.stringify(key);
        return this.items.hasOwnProperty(keyStr);
    }

    delete(key: K): void {
        const keyStr = JSON.stringify(key);
        delete this.items[keyStr];
        delete this.keyMap[keyStr];
    }

    clear(): void {
        this.items = {};
        this.keyMap = {};
    }
} 