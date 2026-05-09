export function difference<T extends object>(a: T[], b: T[], key: keyof T) {
    const bSet = new Set(b.map(item => item[key]));
    return a.filter(item => !bSet.has(item[key]));
}