/**
 * 简单的Set实现，用于ES5环境
 */
export class SimpleSet<T> {
    private items: { [key: string]: T } = {};

    constructor(values?: T[]) {
        if (values) {
            values.forEach(value => this.add(value));
        }
    }

    add(value: T): void {
        const key = JSON.stringify(value);
        this.items[key] = value;
    }

    has(value: T): boolean {
        const key = JSON.stringify(value);
        return this.items.hasOwnProperty(key);
    }

    delete(value: T): void {
        const key = JSON.stringify(value);
        delete this.items[key];
    }

    clear(): void {
        this.items = {};
    }

    values(): T[] {
        return Object.keys(this.items).map(key => this.items[key]);
    }
} 