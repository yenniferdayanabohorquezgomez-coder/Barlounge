// algoritmo de selección para ordenar el catálogo antes de presentarlo.
export function selectionSort(items, key = 'name') {
  const arr = [...items];
  for (let i = 0; i < arr.length - 1; i += 1) {
    let min = i;
    for (let j = i + 1; j < arr.length; j += 1) {
      const a = String(arr[j]?.[key] ?? '').toLowerCase();
      const b = String(arr[min]?.[key] ?? '').toLowerCase();
      if (a.localeCompare(b) < 0) min = j;
    }
    if (min !== i) [arr[i], arr[min]] = [arr[min], arr[i]];
  }
  return arr;
}