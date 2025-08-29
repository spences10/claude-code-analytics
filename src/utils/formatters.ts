export function format_duration(duration_ms?: number): string {
	if (!duration_ms) return '';

	const minutes = Math.floor(duration_ms / 60000);
	const seconds = Math.floor((duration_ms % 60000) / 1000);

	if (minutes === 0) return `${seconds}s`;
	if (minutes < 60) return `${minutes}m ${seconds}s`;

	const hours = Math.floor(minutes / 60);
	const remaining_minutes = minutes % 60;
	return `${hours}h ${remaining_minutes}m`;
}

export function format_cost(cost_usd?: number): string {
	if (cost_usd === undefined) return '';

	if (cost_usd < 0.01) return `$${(cost_usd * 1000).toFixed(1)}¢`;
	if (cost_usd < 1) return `$${cost_usd.toFixed(3)}`;
	return `$${cost_usd.toFixed(2)}`;
}
