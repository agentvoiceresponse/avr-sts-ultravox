const fs = require('fs');
const path = require('path');

/** Tool modules on disk must be alphanumeric plus _ or - (basename only; blocks path traversal via toolName). */
const SAFE_DISK_TOOL_NAME = /^[a-zA-Z0-9_-]+$/;

function assertSafeDiskToolName(name) {
  if (typeof name !== 'string' || name.trim() !== name || !SAFE_DISK_TOOL_NAME.test(name)) {
    throw new Error(`Invalid or unsafe tool name: ${typeof name === 'string' ? JSON.stringify(name) : typeof name}`);
  }
  return name;
}

/**
 * Loads all available tools from both avr_tools and tools directories
 * @returns {Array} List of all available tools
 */
function loadTools() {
  // Define tool directory paths
  const avrToolsDir = path.join(__dirname, 'avr_tools');  // Project-provided tools
  const toolsDir = path.join(__dirname, 'tools');         // User custom tools
  
  let allTools = [];
  
  // Helper function to load tools from a directory
  const loadToolsFromDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return [];
    
    return fs.readdirSync(dirPath)
      .filter((file) => file.endsWith('.js'))
      .map(file => {
        const tool = require(path.join(dirPath, file));
        return {
          type: 'function',
          name: tool.name,
          description: tool.description || '',
          parameters: tool.input_schema || {},
        };
      });
  };

  // Load tools from both directories
  allTools = [
    ...loadToolsFromDir(avrToolsDir),  // Project tools
    ...loadToolsFromDir(toolsDir)      // Custom tools
  ];

  // Warning if no tools found
  if (allTools.length === 0) {
    console.warn(`No tools found in ${avrToolsDir} or ${toolsDir}`);
  }

  return allTools;
}

/**
 * Gets the handler for a specific tool
 * @param {string} name - Name of the tool
 * @returns {Function} Tool handler
 * @throws {Error} If the tool is not found
 */
function getToolHandler(name) {
  const safe = assertSafeDiskToolName(name);

  const possiblePaths = [
    path.join(__dirname, 'avr_tools', `${safe}.js`),
    path.join(__dirname, 'tools', `${safe}.js`),
  ];

  // Find the first valid path
  const toolPath = possiblePaths.find(path => fs.existsSync(path));
  
  if (!toolPath) {
    throw new Error(`Tool "${name}" not found in any available directory`);
  }

  const tool = require(toolPath);
  return tool.handler;
}

module.exports = { loadTools, getToolHandler };