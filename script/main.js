let array = '';

const resize = () => {
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;

    const canvasRatio = window.map.width / window.map.height;
    const clientRatio = clientWidth / clientHeight;

    if (canvasRatio > clientRatio) {
        window.map.style.width = '100%';
        window.map.style.height = clientWidth / canvasRatio + 'px';
    } else {
        window.map.style.width = 'auto';
        window.map.style.height = '100%';
    }
};

const sideByPower = power => Math.pow(2, power) + 1;

const displaceMidpoint = (points, factor) => {
    const average = points.reduce((a, b) => a + b) / points.length;
    const offset = Math.floor(Math.random() * factor);

    return average + (Math.random() < 0.5 ? offset : -offset);
};

const point = (map, x, y) => {
    if ( ! map[x]) return 0;
    if ( ! map[x][y]) return 0;

    return map[x][y];
};

const diamondSquare = (map, step) => {
    if (step < 2) return;

    for (let x = 0; x < map.length - 1; x += step)
        for (let y = 0; y < map.length - 1; y += step)
            map[x + step / 2][y + step / 2] = displaceMidpoint([
                map[x][y],
                map[x + step][y],
                map[x][y + step],
                map[x + step][y + step]
            ], step / 2);

    for (let x = 0; x < map.length - 1; x += step)
        for (let y = 0; y < map.length - 1; y += step) {
            const factor = step / 3;

            const left = point(map, x - step / 2, y + step / 2);
            const top = point(map, x + step / 2, y - step / 2);
            const right = point(map, x + step * 1.5, y + step / 2);
            const bot = point(map, x + step / 2, y + step * 1.5);

            const center = map[x + step / 2][y + step / 2];

            if (map[x][y + step / 2] == null) {
                map[x][y + step / 2] = displaceMidpoint([
                    left, map[x][y], map[x][y + step], center
                ], factor);
            }

            if (map[x + step / 2][y] == null) {
                map[x + step / 2][y] = displaceMidpoint([
                    top, map[x][y], map[x + step][y], center
                ], factor);
            }

            if (map[x + step][y + step / 2] == null) {
                map[x + step][y + step / 2] = displaceMidpoint([
                    right, map[x + step][y], map[x + step][y + step], center
                ], factor);
            }

            if (map[x + step / 2][y + step] == null) {
                map[x + step / 2][y + step] = displaceMidpoint([
                    bot, map[x][y + step], map[x + step][y + step], center
                ], factor);
            }
        }

    diamondSquare(map, step / 2);
};

const normalize = map => {
    const innerMax = (p, v) => Math.max(p, v);
    const outerMax = (p, v) => Math.max(p, v.reduce(innerMax));
    const innerMin = (p, v) => Math.min(p, v);
    const outerMin = (p, v) => Math.min(p, v.reduce(innerMin));

    const max = map.reduce(outerMax, 0);
    const min = map.reduce(outerMin, 0);
    const factor = 255 / (max - min);

    return map.map(column => column.map(value => (value - min) * factor));
};

const endsInWater = (map, side) => {
    const range = (x, y) => Math.pow(Math.sqrt(Math.pow(side / 2 - x, 2) + Math.pow(side / 2 - y, 2)) / (side / 2), 5);
    const subtractClamped = (a, b) => a - b < 0 ? 0 : a - b;

    return map.map((column, x) => column.map((value, y) => map[x][y] = subtractClamped(value, range(x, y) * 255)));
};

const biom = altitude => {
    if (altitude < 101) {
        const part = Math.pow(altitude / 100, 3);
        return [50 + 100 * part, 50 + 190 * part, 200 + 55 * part].map(Math.round);
    }

    if (altitude < 136) {
        const part = (altitude - 100) / 35;
        return [240 - 90 * part, 240 - 20 * part, 175 - 105 * part].map(Math.round);
    }

    if (altitude < 206) {
        const part = (altitude - 135) / 70;
        return [150 - 120 * part, 220 - 40 * part, 70 + 10 * part].map(Math.round);
    }

    const part = (altitude - 205) / 50;
    return [30 + 70 * part, 180 - 80 * part, 80 - 60 * part].map(Math.round);
};

const fill = (length, ctx) => {
    const map = Array(length).fill().map(() => Array(length).fill(null));

    map[0][0] = 0;
    map[0][length - 1] = 0;
    map[length - 1][0] = 0;
    map[length - 1][length - 1] = 0;

    diamondSquare(map, length - 1);

    const preNormalized = normalize(map);
    const rounded = endsInWater(preNormalized, length);
    const normalized = normalize(rounded);

    const blocks = normalized.map(column => {
        const simplified = column.map(value => {
            if (value < 101) return 0;
            if (value < 136) return 1;
            if (value < 206) return 2;
    
            return 3;
        });

        return simplified.slice(7, 507);
    });

    array = JSON.stringify(blocks.slice(7, 507));

    const imageData = ctx.getImageData(0, 0, length, length);
    const data = imageData.data;

    normalized.forEach((column, x) => {
        column.forEach((value, y) => {
            const i = (x + y * length) * 4;
            const rgb = biom(value);

            data[i    ] = rgb[0];
            data[i + 1] = rgb[1];
            data[i + 2] = rgb[2];
            data[i + 3] = 255;
        });
    });

    ctx.putImageData(imageData, 0, 0);
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', resize);
    resize();

    const length = sideByPower(9);
    const canvas = document.getElementById('map');
    const ctx = canvas.getContext('2d');

    window.refresh.addEventListener('click', () => fill(length, ctx));
    fill(length, ctx);
});
