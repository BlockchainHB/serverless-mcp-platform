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

		// LinkedIn Jobs Scraper tool
		this.server.tool(
			"scrape_linkedin_jobs",
			{
				jobTitle: z.string().describe("Job title to search for (e.g., 'Software Engineer', 'Marketing Manager')"),
				location: z.string().optional().describe("Location for the job search (e.g., 'San Francisco, CA', 'Remote')"),
				companyName: z.array(z.string()).optional().describe("Array of company names to filter by"),
				experienceLevel: z.enum(["Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive"]).optional().describe("Experience level filter"),
				jobType: z.enum(["Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship", "Other"]).optional().describe("Employment type filter"),
				maxResults: z.number().min(1).max(100).default(10).describe("Maximum number of jobs to return (1-100)")
			},
			async ({ jobTitle, location, companyName, experienceLevel, jobType, maxResults }) => {
				try {
					// Prepare the input for the Apify actor
					const actorInput: any = {
						jobTitle,
						maxResults,
					};

					// Add optional parameters if provided
					if (location) actorInput.location = location;
					if (companyName && companyName.length > 0) actorInput.companyName = companyName;
					if (experienceLevel) actorInput.experienceLevel = experienceLevel;
					if (jobType) actorInput.jobType = jobType;

					// Use Apify proxy for better success rates
					actorInput.proxy = {
						useApifyProxy: true,
						apifyProxyGroups: ["RESIDENTIAL"]
					};

					// Call the Apify actor
					const response = await fetch(`https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/runs`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${env.APIFY_API_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(actorInput)
					});

					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: Failed to start LinkedIn job scraper. Status: ${response.status}`
							}]
						};
					}

					const runData = await response.json();
					const runId = runData.data.id;

					// Wait for the run to complete (with timeout)
					let attempts = 0;
					const maxAttempts = 60; // 5 minutes timeout
					let runStatus = 'RUNNING';

					while (runStatus === 'RUNNING' && attempts < maxAttempts) {
						await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
						
						const statusResponse = await fetch(`https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/runs/${runId}`, {
							headers: {
								'Authorization': `Bearer ${env.APIFY_API_KEY}`,
							}
						});

						if (statusResponse.ok) {
							const statusData = await statusResponse.json();
							runStatus = statusData.data.status;
						}
						attempts++;
					}

					if (runStatus !== 'SUCCEEDED') {
						return {
							content: [{
								type: "text",
								text: `Job scraping did not complete successfully. Status: ${runStatus}. This might be due to LinkedIn blocking or timeout.`
							}]
						};
					}

					// Get the results
					const resultsResponse = await fetch(`https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/runs/${runId}/dataset/items`, {
						headers: {
							'Authorization': `Bearer ${env.APIFY_API_KEY}`,
						}
					});

					if (!resultsResponse.ok) {
						return {
							content: [{
								type: "text",
								text: `Error fetching results. Status: ${resultsResponse.status}`
							}]
						};
					}

					const jobs = await resultsResponse.json();

					if (!jobs || jobs.length === 0) {
						return {
							content: [{
								type: "text",
								text: `No jobs found for "${jobTitle}"${location ? ` in ${location}` : ''}. Try different search terms or location.`
							}]
						};
					}

					// Format the results
					const formattedJobs = jobs.slice(0, maxResults).map((job: any, index: number) => {
						const jobInfo = [
							`**${index + 1}. ${job.title || 'N/A'}**`,
							`🏢 **Company:** ${job.companyName || 'N/A'}`,
							`📍 **Location:** ${job.location || 'N/A'}`,
							`⏰ **Posted:** ${job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A'}`,
							`🔗 **Link:** ${job.link || 'N/A'}`,
						];

						if (job.salary) jobInfo.push(`💰 **Salary:** ${job.salary}`);
						if (job.workplaceType) jobInfo.push(`🏠 **Type:** ${job.workplaceType}`);
						if (job.applicantsCount) jobInfo.push(`👥 **Applicants:** ${job.applicantsCount}`);
						
						return jobInfo.join('\n');
					}).join('\n\n---\n\n');

					return {
						content: [{
							type: "text",
							text: `# LinkedIn Jobs Search Results\n\n**Search Query:** "${jobTitle}"${location ? ` in ${location}` : ''}\n**Found:** ${jobs.length} jobs (showing ${Math.min(maxResults, jobs.length)})\n\n${formattedJobs}`
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