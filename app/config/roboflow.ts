/**
 * Roboflow Configuration
 * Update these values with your actual Roboflow credentials
 */

export const ROBOFLOW_CONFIG = {
  // Your Roboflow API key (get from https://app.roboflow.com/settings/api)
  API_KEY: process.env.ROBOFLOW_API_KEY || process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || "",
  
  // Your workspace name (usually your username)
  WORKSPACE_NAME: process.env.NEXT_PUBLIC_ROBOFLOW_WORKSPACE || "meggtech",
  
  // Your workflow ID (get this from your deployed workflow)
  WORKFLOW_ID: process.env.NEXT_PUBLIC_ROBOFLOW_WORKFLOW_ID || "meggworkflow",
  
  // Roboflow serverless API URL
  API_URL: "https://serverless.roboflow.com",
  
  // Request timeout in milliseconds
  TIMEOUT: 30000,
}

/**
 * Get the full API endpoint URL
 */
export function getRoboflowEndpoint(): string {
  // Workflow endpoint format per Roboflow docs:
  // https://serverless.roboflow.com/{workspace}/workflows/{workflow}
  return `${ROBOFLOW_CONFIG.API_URL}/${ROBOFLOW_CONFIG.WORKSPACE_NAME}/workflows/${ROBOFLOW_CONFIG.WORKFLOW_ID}`
}

/**
 * Check if configuration is complete
 */
export function isConfigComplete(): boolean {
  return (
    ROBOFLOW_CONFIG.API_KEY.length > 0 &&
    ROBOFLOW_CONFIG.WORKFLOW_ID.length > 0 &&
    ROBOFLOW_CONFIG.WORKSPACE_NAME.length > 0
  )
}
