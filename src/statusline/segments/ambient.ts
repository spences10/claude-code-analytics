import { type SegmentRenderer } from './types';

export const ambient_wave: SegmentRenderer = () => {
	const width = 12;
	const t = Math.floor(Date.now() / 300);
	let out = '';
	for (let i = 0; i < width; i++) {
		out += i === t % width ? '●' : '·';
	}
	return out;
};

export const ambient_bounce: SegmentRenderer = (_d, _i, config) => {
	const width = 12;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const t = Math.floor(Date.now() / 300);
	const period = Math.max(2, 2 * (width - 1));
	let pos = t % period;
	if (pos >= width) pos = period - pos;
	let out = '';
	for (let i = 0; i < width; i++) {
		out += i === pos ? (ascii ? 'o' : '●') : ascii ? '.' : '·';
	}
	return out;
};

export const ambient_marquee: SegmentRenderer = (_d, _i, config) => {
	const width = 12;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const t = Math.floor(Date.now() / 200);
	const pattern = ascii ? ['.', '=', '-', '='] : ['░', '▒', '▓', '▒'];
	const plen = pattern.length;
	let out = '';
	for (let i = 0; i < width; i++) {
		const idx = (i + t) % plen;
		out += pattern[idx];
	}
	return out;
};

export const ambient_spinner: SegmentRenderer = () => {
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	const t = Math.floor(Date.now() / 120);
	return frames[t % frames.length];
};

export const ambient_twinkle: SegmentRenderer = (_d, _i, config) => {
	const width = 12;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const t = Math.floor(Date.now() / 400);
	const p1 = (t * 3 + 1) % width;
	const p2 = (t * 5 + 2) % width;
	const p3 = (t * 7 + 3) % width;
	const star = ascii ? '*' : '✦';
	const dot = ascii ? '.' : '·';
	let out = '';
	for (let i = 0; i < width; i++) {
		out += i === p1 || i === p2 || i === p3 ? star : dot;
	}
	return out;
};

export const ambient_wave_sine: SegmentRenderer = (
	_d,
	_i,
	config,
) => {
	const width = 12;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const blocks = ascii
		? ['_', '-', '=']
		: ['▁', '▂', '▃', '▄', '▅', '▆', '▇'];
	const t = Math.floor(Date.now() / 200);
	let out = '';
	for (let x = 0; x < width; x++) {
		const phase = (t + x) / 3;
		const s = Math.sin(phase);
		const idx = Math.max(
			0,
			Math.min(
				blocks.length - 1,
				Math.round(((s + 1) / 2) * (blocks.length - 1)),
			),
		);
		out += blocks[idx];
	}
	return out;
};

export const ambient_diagonal: SegmentRenderer = (_d, _i, config) => {
	const width = 12;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const pattern = ascii ? ['/', '\\'] : ['╱', '╲'];
	const t = Math.floor(Date.now() / 200);
	let out = '';
	for (let i = 0; i < width; i++) {
		const idx = (i + t) % 2;
		out += pattern[idx];
	}
	return out;
};
