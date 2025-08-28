declare module 'asciichart' {
	interface PlotOptions {
		height?: number;
		format?: (value: number) => string;
		padding?: string;
		offset?: number;
	}

	export function plot(data: number[], options?: PlotOptions): string;
}
