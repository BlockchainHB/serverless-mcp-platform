import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "BlockchainHB Remote MCP Server",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						result = a / b;
						break;
				}
				return {
					content: [{ type: "text", text: String(result) }],
				};
			}
		);

		// LinkedIn Jobs Scraper using sync API
		this.server.tool(
			"scrape_linkedin_jobs",
			{
				jobTitle: z.string().describe("Job title to search for (e.g., 'Software Engineer', 'Marketing Manager')"),
				location: z.string().optional().describe("Location for the job search (e.g., 'San Francisco, CA', 'Remote')"),
				maxResults: z.number().min(1).max(100).default(10).describe("Maximum number of jobs to return (1-100)"),
				experienceLevel: z.enum(["Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive"]).optional(),
				jobType: z.enum(["Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship", "Other"]).optional(),
				companyName: z.array(z.string()).optional().describe("Array of company names to filter by"),
			},
			async ({ jobTitle, location, maxResults, experienceLevel, jobType, companyName }) => {
				try {
					const input = {
						title: jobTitle,
						location: location || "",
						rows: maxResults,
						companyName: companyName || [],
						companyId: "",
						experienceLevel: experienceLevel || "",
						jobType: jobType || "",
						proxy: {
							useApifyProxy: true,
							apifyProxyGroups: ["RESIDENTIAL"]
						}
					};

					// Use the sync API endpoint
					const url = new URL('https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/run-sync-get-dataset-items');
					url.searchParams.set('token', process.env.APIFY_API_KEY || '');
					
					const response = await fetch(url.toString(), {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(input),
					});

					if (!response.ok) {
						throw new Error(`LinkedIn API failed: ${response.status} ${response.statusText}`);
					}

					const results = await response.json();
					
					return {
						content: [{ 
							type: "text", 
							text: `Found ${Array.isArray(results) ? results.length : 0} LinkedIn job(s):\n\n${JSON.stringify(results, null, 2)}`
						}],
					};
				} catch (error) {
					return {
						content: [{ 
							type: "text", 
							text: `Error scraping LinkedIn jobs: ${error.message}`
						}],
					};
				}
			}
		);

		// Indeed Jobs Scraper using sync API
		this.server.tool(
			"scrape_indeed_jobs",
			{
				position: z.string().describe("Job position to search for (e.g., 'web developer', 'marketing manager')"),
				country: z.string().default("US").describe("Country code for job search (default: US)"),
				location: z.string().optional().describe("Location for the job search (e.g., 'San Francisco')"),
				maxItems: z.number().min(1).max(100).default(50).describe("Maximum number of jobs to return (1-100)"),
				parseCompanyDetails: z.boolean().default(false).describe("Whether to parse detailed company information"),
				saveOnlyUniqueItems: z.boolean().default(true).describe("Whether to save only unique job items"),
				followApplyRedirects: z.boolean().default(false).describe("Whether to follow apply redirect links"),
			},
			async ({ position, country, location, maxItems, parseCompanyDetails, saveOnlyUniqueItems, followApplyRedirects }) => {
				try {
					const input = {
						position,
						country,
						location: location || "",
						maxItems,
						parseCompanyDetails,
						saveOnlyUniqueItems,
						followApplyRedirects
					};

					// Use the sync API endpoint
					const url = new URL('https://api.apify.com/v2/acts/misceres~indeed-scraper/run-sync-get-dataset-items');
					url.searchParams.set('token', process.env.APIFY_API_KEY || '');
					
					const response = await fetch(url.toString(), {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(input),
					});

					if (!response.ok) {
						throw new Error(`Indeed API failed: ${response.status} ${response.statusText}`);
					}

					const results = await response.json();
					
					return {
						content: [{ 
							type: "text", 
							text: `Found ${Array.isArray(results) ? results.length : 0} Indeed job(s):\n\n${JSON.stringify(results, null, 2)}`
						}],
					};
				} catch (error) {
					return {
						content: [{ 
							type: "text", 
							text: `Error scraping Indeed jobs: ${error.message}`
						}],
					};
				}
			}
		);
	}
}

// Export for Cloudflare Workers
export default {
	async fetch(request: Request, env: any) {
		const myMcp = new MyMCP();
		await myMcp.init();
		return myMcp.run(request);
	},
};