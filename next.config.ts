import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	cacheComponents: true,
	partialPrefetching: true,
	reactCompiler: true,
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
	experimental: {
		serverActions: { bodySizeLimit: "50mb" },
		instantInsights: { validationLevel: "manual-warning" },
	},
};

export default nextConfig;
