import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApifyClient } from "apify-client";
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
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// LinkedIn Jobs Scraper tool using proper ApifyClient
		this.server.tool(
			"scrape_linkedin_jobs",
			{
				jobTitle: z.string().describe("Job title to search for (e.g., 'Software Engineer', 'Marketing Manager')"),
				location: z.string().optional().describe("Location for the job search (e.g., 'San Francisco, CA', 'Remote')"),
				companyName: z.array(z.string()).optional().describe("Array of company names to filter by"),
				companyId: z.array(z.string()).optional().describe("Array of LinkedIn company IDs to filter by"),
				experienceLevel: z.enum(["Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive"]).optional().describe("Experience level filter"),
				jobType: z.enum(["Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship", "Other"]).optional().describe("Employment type filter"),
				maxResults: z.number().min(1).max(100).default(10).describe("Maximum number of jobs to return (1-100)")
			},
			async ({ jobTitle, location, companyName, companyId, experienceLevel, jobType, maxResults }) => {
				try {
					// Initialize the ApifyClient with API token
					const client = new ApifyClient({
						token: 'apify_api_WnbWHgBUR6xR7F5JeVGQwXcQEokbPR2dhmpq',
					});

					// Prepare Actor input using the correct format
					const input: any = {
						title: jobTitle || "",
						location: location || "United States",
						rows: maxResults,
						proxy: {
							useApifyProxy: true,
							apifyProxyGroups: ["RESIDENTIAL"]
						}
					};

					// Add optional parameters if provided
					if (companyName && companyName.length > 0) {
						input.companyName = companyName;
					}
					
					if (companyId && companyId.length > 0) {
						input.companyId = companyId;
					}

					// Run the Actor and wait for it to finish using the correct actor ID
					const run = await client.actor("BHzefUZlZRKWxkTck").call(input);

					// Fetch Actor results from the run's dataset
					const { items } = await client.dataset(run.defaultDatasetId).listItems();

					if (!items || items.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No jobs found for "${jobTitle}"${location ? ` in ${location}` : ''}. Try different search terms or location.`
							}]
						};
					}

					// Format the results
					const formattedJobs = items.slice(0, maxResults).map((job: any, index: number) => {
						const jobInfo = [
							`**${index + 1}. ${job.title || job.jobTitle || 'N/A'}**`,
							`🏢 **Company:** ${job.companyName || job.company || 'N/A'}`,
							`📍 **Location:** ${job.location || job.jobLocation || 'N/A'}`,
							`⏰ **Posted:** ${job.publishedAt || job.postedAt || job.datePosted || 'N/A'}`,
							`🔗 **Link:** ${job.jobUrl || job.url || job.link || 'N/A'}`,
						];

						// Add optional fields if they exist
						if (job.salary || job.salaryRange) {
							jobInfo.push(`💰 **Salary:** ${job.salary || job.salaryRange}`);
						}
						if (job.jobType || job.employmentType) {
							jobInfo.push(`🏠 **Type:** ${job.jobType || job.employmentType}`);
						}
						if (job.applicants || job.applicantsCount) {
							jobInfo.push(`👥 **Applicants:** ${job.applicants || job.applicantsCount}`);
						}
						if (job.description) {
							// Truncate description to first 200 characters
							const shortDesc = job.description.length > 200 
								? job.description.substring(0, 200) + "..." 
								: job.description;
							jobInfo.push(`📄 **Description:** ${shortDesc}`);
						}
						
						return jobInfo.join('\n');
					}).join('\n\n---\n\n');

					return {
						content: [{
							type: "text",
							text: `# LinkedIn Jobs Search Results\n\n**Search Query:** "${jobTitle}"${location ? ` in ${location}` : ''}\n**Found:** ${items.length} jobs (showing ${Math.min(maxResults, items.length)})\n\n${formattedJobs}`
						}]
					};

				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error scraping LinkedIn jobs: ${error.message}`
						}]
					};
				}
			}
		);

		// Indeed Jobs Scraper tool using misceres/indeed-scraper
		this.server.tool(
			"scrape_indeed_jobs",
			{
				position: z.string().describe("Job position to search for (e.g., 'web developer', 'marketing manager')"),
				country: z.string().default("US").describe("Country code (e.g., 'US', 'CA', 'UK', 'DE')"),
				location: z.string().optional().describe("Location for the job search (e.g., 'San Francisco', 'New York', 'Remote')"),
				maxItems: z.number().min(1).max(100).default(50).describe("Maximum number of jobs to return (1-100)"),
				parseCompanyDetails: z.boolean().default(false).describe("Whether to parse detailed company information"),
				saveOnlyUniqueItems: z.boolean().default(true).describe("Whether to save only unique job items"),
				followApplyRedirects: z.boolean().default(false).describe("Whether to follow apply redirects for more details")
			},
			async ({ position, country, location, maxItems, parseCompanyDetails, saveOnlyUniqueItems, followApplyRedirects }) => {
				try {
					// Initialize the ApifyClient with API token
					const client = new ApifyClient({
						token: 'apify_api_WnbWHgBUR6xR7F5JeVGQwXcQEokbPR2dhmpq',
					});

					// Prepare Actor input using the correct format for Indeed scraper
					const input: any = {
						position,
						country,
						maxItems,
						parseCompanyDetails,
						saveOnlyUniqueItems,
						followApplyRedirects
					};

					// Add location if provided
					if (location) {
						input.location = location;
					}

					// Run the Indeed Actor and wait for it to finish
					const run = await client.actor("hMvNSpz3JnHgl5jkh").call(input);

					// Fetch Actor results from the run's dataset
					const { items } = await client.dataset(run.defaultDatasetId).listItems();

					if (!items || items.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No jobs found for "${position}"${location ? ` in ${location}` : ` in ${country}`}. Try different search terms or location.`
							}]
						};
					}

					// Format the results
					const formattedJobs = items.slice(0, maxItems).map((job: any, index: number) => {
						const jobInfo = [
							`**${index + 1}. ${job.positionName || job.title || job.jobTitle || 'N/A'}**`,
							`🏢 **Company:** ${job.company || job.companyName || 'N/A'}`,
							`📍 **Location:** ${job.location || job.jobLocation || 'N/A'}`,
							`⏰ **Posted:** ${job.postedAt || job.datePosted || job.posted || 'N/A'}`,
							`🔗 **Link:** ${job.url || job.jobUrl || job.link || 'N/A'}`,
						];

						// Add optional fields if they exist
						if (job.salary || job.salaryRange || job.estimatedSalary) {
							jobInfo.push(`💰 **Salary:** ${job.salary || job.salaryRange || job.estimatedSalary}`);
						}
						if (job.jobType || job.employmentType || job.schedule) {
							jobInfo.push(`🏠 **Type:** ${job.jobType || job.employmentType || job.schedule}`);
						}
						if (job.rating || job.companyRating) {
							jobInfo.push(`⭐ **Company Rating:** ${job.rating || job.companyRating}`);
						}
						if (job.description) {
							// Truncate description to first 200 characters
							const shortDesc = job.description.length > 200 
								? job.description.substring(0, 200) + "..." 
								: job.description;
							jobInfo.push(`📄 **Description:** ${shortDesc}`);
						}
						
						return jobInfo.join('\n');
					}).join('\n\n---\n\n');

					return {
						content: [{
							type: "text",
							text: `# Indeed Jobs Search Results\n\n**Search Query:** "${position}"${location ? ` in ${location}` : ` in ${country}`}\n**Found:** ${items.length} jobs (showing ${Math.min(maxItems, items.length)})\n\n${formattedJobs}`
						}]
					};

				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error scraping Indeed jobs: ${error.message}`
						}]
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};