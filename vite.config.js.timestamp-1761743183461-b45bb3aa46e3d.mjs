// vite.config.js
import path3 from "node:path";
import react from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/@vitejs/plugin-react/dist/index.js";
import { createLogger, defineConfig } from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/vite/dist/node/index.js";

// plugins/visual-editor/vite-plugin-react-inline-editor.js
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/@babel/traverse/lib/index.js";
import generate from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///C:/Users/ander/source/repos/frontend_doxologos/node_modules/@babel/types/lib/index.js";
import fs from "fs";
var __vite_injected_original_import_meta_url = "file:///C:/Users/ander/source/repos/frontend_doxologos/plugins/visual-editor/vite-plugin-react-inline-editor.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname2 = path.dirname(__filename);
var VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
var EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "Label", "img"];
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function validateImageSrc(openingNode) {
  if (!openingNode || !openingNode.name || openingNode.name.name !== "img") {
    return { isValid: true, reason: null };
  }
  const hasPropsSpread = openingNode.attributes.some(
    (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
  );
  if (hasPropsSpread) {
    return { isValid: false, reason: "props-spread" };
  }
  const srcAttr = openingNode.attributes.find(
    (attr) => t.isJSXAttribute(attr) && attr.name && attr.name.name === "src"
  );
  if (!srcAttr) {
    return { isValid: false, reason: "missing-src" };
  }
  if (!t.isStringLiteral(srcAttr.value)) {
    return { isValid: false, reason: "dynamic-src" };
  }
  if (!srcAttr.value.value || srcAttr.value.value.trim() === "") {
    return { isValid: false, reason: "empty-src" };
  }
  return { isValid: true, reason: null };
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path.sep).join("/");
      try {
        const babelAst = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel.default(babelAst, {
          enter(path4) {
            if (path4.isJSXOpeningElement()) {
              const openingNode = path4.node;
              const elementNode = path4.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              const imageValidation = validateImageSrc(openingNode);
              if (!imageValidation.isValid) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path4.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const generateFunction = generate.default || generate;
          const output = generateFunction(babelAst, {
            sourceMaps: true,
            sourceFileName: webRelativeFilePath
          }, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
            if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid path" }));
            }
            const originalContent = fs.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parse(originalContent, {
              sourceType: "module",
              plugins: ["jsx", "typescript"],
              errorRecovery: true
            });
            let targetNodePath = null;
            const visitor = {
              JSXOpeningElement(path4) {
                const node = path4.node;
                if (node.loc && node.loc.start.line === line && node.loc.start.column + 1 === column) {
                  targetNodePath = path4;
                  path4.stop();
                }
              }
            };
            traverseBabel.default(babelAst, visitor);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            const generateFunction = generate.default || generate;
            const targetOpeningElement = targetNodePath.node;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            const isImageElement = targetOpeningElement.name && targetOpeningElement.name.name === "img";
            let beforeCode = "";
            let afterCode = "";
            let modified = false;
            if (isImageElement) {
              const beforeOutput = generateFunction(targetOpeningElement, {});
              beforeCode = beforeOutput.code;
              const srcAttr = targetOpeningElement.attributes.find(
                (attr) => t.isJSXAttribute(attr) && attr.name && attr.name.name === "src"
              );
              if (srcAttr && t.isStringLiteral(srcAttr.value)) {
                srcAttr.value = t.stringLiteral(newFullText);
                modified = true;
                const afterOutput = generateFunction(targetOpeningElement, {});
                afterCode = afterOutput.code;
              }
            } else {
              if (parentElementNode && t.isJSXElement(parentElementNode)) {
                const beforeOutput = generateFunction(parentElementNode, {});
                beforeCode = beforeOutput.code;
                parentElementNode.children = [];
                if (newFullText && newFullText.trim() !== "") {
                  const newTextNode = t.jsxText(newFullText);
                  parentElementNode.children.push(newTextNode);
                }
                modified = true;
                const afterOutput = generateFunction(parentElementNode, {});
                afterCode = afterOutput.code;
              }
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            const output = generateFunction(babelAst, {});
            const newContent = output.code;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent,
              beforeCode,
              afterCode
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}

// plugins/visual-editor/vite-plugin-edit-mode.js
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// plugins/visual-editor/visual-editor-config.js
var EDIT_MODE_STYLES = `
  #root[data-edit-mode-enabled="true"] [data-edit-id] {
    cursor: pointer; 
    outline: 2px dashed #357DF9; 
    outline-offset: 2px;
    min-height: 1em;
  }
  #root[data-edit-mode-enabled="true"] img[data-edit-id] {
    outline-offset: -2px;
  }
  #root[data-edit-mode-enabled="true"] {
    cursor: pointer;
  }
  #root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
    background-color: #357DF933;
    outline-color: #357DF9; 
  }

  @keyframes fadeInTooltip {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #inline-editor-disabled-tooltip {
    display: none; 
    opacity: 0; 
    position: absolute;
    background-color: #1D1E20;
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    border: 1px solid #3B3D4A;
    max-width: 184px;
    text-align: center;
  }

  #inline-editor-disabled-tooltip.tooltip-active {
    display: block;
    animation: fadeInTooltip 0.2s ease-out forwards;
  }
`;

// plugins/visual-editor/vite-plugin-edit-mode.js
var __vite_injected_original_import_meta_url2 = "file:///C:/Users/ander/source/repos/frontend_doxologos/plugins/visual-editor/vite-plugin-edit-mode.js";
var __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
var __dirname3 = resolve(__filename2, "..");
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}

// plugins/vite-plugin-iframe-route-restoration.js
function iframeRouteRestorationPlugin() {
  return {
    name: "vite:iframe-route-restoration",
    apply: "serve",
    transformIndexHtml() {
      const script = `
      const ALLOWED_PARENT_ORIGINS = [
          "https://horizons.hostinger.com",
          "https://horizons.hostinger.dev",
          "https://horizons-frontend-local.hostinger.dev",
      ];

        // Check to see if the page is in an iframe
        if (window.self !== window.top) {
          const STORAGE_KEY = 'horizons-iframe-saved-route';

          const getCurrentRoute = () => location.pathname + location.search + location.hash;

          const save = () => {
            try {
              const currentRoute = getCurrentRoute();
              sessionStorage.setItem(STORAGE_KEY, currentRoute);
              window.parent.postMessage({message: 'route-changed', route: currentRoute}, '*');
            } catch {}
          };

          const replaceHistoryState = (url) => {
            try {
              history.replaceState(null, '', url);
              window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
              return true;
            } catch {}
            return false;
          };

          const restore = () => {
            try {
              const saved = sessionStorage.getItem(STORAGE_KEY);
              if (!saved) return;

              if (!saved.startsWith('/')) {
                sessionStorage.removeItem(STORAGE_KEY);
                return;
              }

              const current = getCurrentRoute();
              if (current !== saved) {
                if (!replaceHistoryState(saved)) {
                  replaceHistoryState('/');
                }

                requestAnimationFrame(() => setTimeout(() => {
                  try {
                    const text = (document.body?.innerText || '').trim();

                    // If the restored route results in too little content, assume it is invalid and navigate home
                    if (text.length < 50) {
                      replaceHistoryState('/');
                    }
                  } catch {}
                }, 1000));
              }
            } catch {}
          };

          const originalPushState = history.pushState;
          history.pushState = function(...args) {
            originalPushState.apply(this, args);
            save();
          };

          const originalReplaceState = history.replaceState;
          history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            save();
          };

          const getParentOrigin = () => {
              if (
                  window.location.ancestorOrigins &&
                  window.location.ancestorOrigins.length > 0
              ) {
                  return window.location.ancestorOrigins[0];
              }

              if (document.referrer) {
                  try {
                      return new URL(document.referrer).origin;
                  } catch (e) {
                      console.warn("Invalid referrer URL:", document.referrer);
                  }
              }

              return null;
          };

          window.addEventListener('popstate', save);
          window.addEventListener('hashchange', save);
          window.addEventListener("message", function (event) {
              const parentOrigin = getParentOrigin();

              if (event.data?.type === "redirect-home" && parentOrigin && ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
                const saved = sessionStorage.getItem(STORAGE_KEY);

                if(saved && saved !== '/') {
                  replaceHistoryState('/')
                }
              }
          });

          restore();
        }
      `;
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: script,
          injectTo: "head"
        }
      ];
    }
  };
}

// functions/load-config.js
import fs2 from "fs";
import path2 from "path";
function loadLocalEnv() {
  try {
    const root = path2.resolve(process.cwd());
    const cfgPath = path2.join(root, "config", "local.env");
    if (!fs2.existsSync(cfgPath))
      return;
    const contents = fs2.readFileSync(cfgPath, "utf8");
    contents.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#"))
        return;
      const idx = trimmed.indexOf("=");
      if (idx === -1)
        return;
      const key = trimmed.slice(0, idx);
      const val = trimmed.slice(idx + 1);
      if (!process.env[key])
        process.env[key] = val;
    });
  } catch (e) {
  }
}

// vite.config.js
var __vite_injected_original_dirname = "C:\\Users\\ander\\source\\repos\\frontend_doxologos";
loadLocalEnv();
var isDev = process.env.NODE_ENV !== "production";
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    const tags = [
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsRuntimeErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsViteErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsConsoleErrroHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configWindowFetchMonkeyPatch,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configNavigationHandler,
        injectTo: "head"
      }
    ];
    if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
      tags.push(
        {
          tag: "script",
          attrs: {
            src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
            "template-redirect-url": process.env.TEMPLATE_REDIRECT_URL
          },
          injectTo: "head"
        }
      );
    }
    return {
      html,
      tags
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  var _a;
  if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    ...isDev ? [inlineEditPlugin(), inlineEditDevPlugin(), iframeRouteRestorationPlugin()] : [],
    react(),
    addTransformIndexHtml
  ],
  server: {
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true,
    proxy: {
      "/functions": {
        target: "http://localhost:3000",
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            if (req.url.includes("/mp-create-preference")) {
              proxy.removeAllListeners("proxyReq");
              proxy.removeAllListeners("proxyRes");
              let body = "";
              req.on("data", (chunk) => {
                body += chunk.toString();
              });
              req.on("end", () => {
                try {
                  const data = JSON.parse(body);
                  console.log("\u{1F535} [DEV] Mock MP Preference:", data);
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({
                    success: true,
                    init_point: `${process.env.VITE_APP_URL || "http://localhost:3000"}/pagamento-simulado?booking_id=${data.booking_id}`,
                    mp: {
                      id: "mock_preference_" + Date.now(),
                      init_point: `${process.env.VITE_APP_URL || "http://localhost:3000"}/pagamento-simulado?booking_id=${data.booking_id}`
                    }
                  }));
                } catch (err) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Mock MP error", details: err.message }));
                }
              });
            }
          });
        }
      }
    }
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path3.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcyIsICJwbHVnaW5zL3Zpc3VhbC1lZGl0b3IvdmlzdWFsLWVkaXRvci1jb25maWcuanMiLCAicGx1Z2lucy92aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanMiLCAiZnVuY3Rpb25zL2xvYWQtY29uZmlnLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYW5kZXJcXFxcc291cmNlXFxcXHJlcG9zXFxcXGZyb250ZW5kX2RveG9sb2dvc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYW5kZXJcXFxcc291cmNlXFxcXHJlcG9zXFxcXGZyb250ZW5kX2RveG9sb2dvc1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYW5kZXIvc291cmNlL3JlcG9zL2Zyb250ZW5kX2RveG9sb2dvcy92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciwgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBpbmxpbmVFZGl0UGx1Z2luIGZyb20gJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMnO1xyXG5pbXBvcnQgZWRpdE1vZGVEZXZQbHVnaW4gZnJvbSAnLi9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzJztcclxuaW1wb3J0IGlmcmFtZVJvdXRlUmVzdG9yYXRpb25QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL3ZpdGUtcGx1Z2luLWlmcmFtZS1yb3V0ZS1yZXN0b3JhdGlvbi5qcyc7XHJcbmltcG9ydCB7IGxvYWRMb2NhbEVudiB9IGZyb20gJy4vZnVuY3Rpb25zL2xvYWQtY29uZmlnLmpzJztcclxuXHJcbi8vIENhcnJlZ2FyIHZhcmlcdTAwRTF2ZWlzIGRlIGFtYmllbnRlIGRlIGNvbmZpZy9sb2NhbC5lbnZcclxubG9hZExvY2FsRW52KCk7XHJcblxyXG5jb25zdCBpc0RldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbic7XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIgPSBgXHJcbmNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xyXG5cdGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XHJcblx0XHRmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRhZGRlZE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXHJcblx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0YWRkZWROb2RlLnRhZ05hbWU/LnRvTG93ZXJDYXNlKCkgPT09ICd2aXRlLWVycm9yLW92ZXJsYXknIHx8XHJcblx0XHRcdFx0XHRhZGRlZE5vZGUuY2xhc3NMaXN0Py5jb250YWlucygnYmFja2Ryb3AnKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aGFuZGxlVml0ZU92ZXJsYXkoYWRkZWROb2RlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xyXG5cdGNoaWxkTGlzdDogdHJ1ZSxcclxuXHRzdWJ0cmVlOiB0cnVlXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gaGFuZGxlVml0ZU92ZXJsYXkobm9kZSkge1xyXG5cdGlmICghbm9kZS5zaGFkb3dSb290KSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCBiYWNrZHJvcCA9IG5vZGUuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCcuYmFja2Ryb3AnKTtcclxuXHJcblx0aWYgKGJhY2tkcm9wKSB7XHJcblx0XHRjb25zdCBvdmVybGF5SHRtbCA9IGJhY2tkcm9wLm91dGVySFRNTDtcclxuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuXHRcdGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcob3ZlcmxheUh0bWwsICd0ZXh0L2h0bWwnKTtcclxuXHRcdGNvbnN0IG1lc3NhZ2VCb2R5RWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcubWVzc2FnZS1ib2R5Jyk7XHJcblx0XHRjb25zdCBmaWxlRWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcuZmlsZScpO1xyXG5cdFx0Y29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlQm9keUVsZW1lbnQgPyBtZXNzYWdlQm9keUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBmaWxlVGV4dCA9IGZpbGVFbGVtZW50ID8gZmlsZUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBlcnJvciA9IG1lc3NhZ2VUZXh0ICsgKGZpbGVUZXh0ID8gJyBGaWxlOicgKyBmaWxlVGV4dCA6ICcnKTtcclxuXHJcblx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0dHlwZTogJ2hvcml6b25zLXZpdGUtZXJyb3InLFxyXG5cdFx0XHRlcnJvcixcclxuXHRcdH0sICcqJyk7XHJcblx0fVxyXG59XHJcbmA7XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIgPSBgXHJcbndpbmRvdy5vbmVycm9yID0gKG1lc3NhZ2UsIHNvdXJjZSwgbGluZW5vLCBjb2xubywgZXJyb3JPYmopID0+IHtcclxuXHRjb25zdCBlcnJvckRldGFpbHMgPSBlcnJvck9iaiA/IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdG5hbWU6IGVycm9yT2JqLm5hbWUsXHJcblx0XHRtZXNzYWdlOiBlcnJvck9iai5tZXNzYWdlLFxyXG5cdFx0c3RhY2s6IGVycm9yT2JqLnN0YWNrLFxyXG5cdFx0c291cmNlLFxyXG5cdFx0bGluZW5vLFxyXG5cdFx0Y29sbm8sXHJcblx0fSkgOiBudWxsO1xyXG5cclxuXHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdHR5cGU6ICdob3Jpem9ucy1ydW50aW1lLWVycm9yJyxcclxuXHRcdG1lc3NhZ2UsXHJcblx0XHRlcnJvcjogZXJyb3JEZXRhaWxzXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlciA9IGBcclxuY29uc3Qgb3JpZ2luYWxDb25zb2xlRXJyb3IgPSBjb25zb2xlLmVycm9yO1xyXG5jb25zb2xlLmVycm9yID0gZnVuY3Rpb24oLi4uYXJncykge1xyXG5cdG9yaWdpbmFsQ29uc29sZUVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xyXG5cclxuXHRsZXQgZXJyb3JTdHJpbmcgPSAnJztcclxuXHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjb25zdCBhcmcgPSBhcmdzW2ldO1xyXG5cdFx0aWYgKGFyZyBpbnN0YW5jZW9mIEVycm9yKSB7XHJcblx0XHRcdGVycm9yU3RyaW5nID0gYXJnLnN0YWNrIHx8IFxcYFxcJHthcmcubmFtZX06IFxcJHthcmcubWVzc2FnZX1cXGA7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYgKCFlcnJvclN0cmluZykge1xyXG5cdFx0ZXJyb3JTdHJpbmcgPSBhcmdzLm1hcChhcmcgPT4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShhcmcpIDogU3RyaW5nKGFyZykpLmpvaW4oJyAnKTtcclxuXHR9XHJcblxyXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0dHlwZTogJ2hvcml6b25zLWNvbnNvbGUtZXJyb3InLFxyXG5cdFx0ZXJyb3I6IGVycm9yU3RyaW5nXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2ggPSBgXHJcbmNvbnN0IG9yaWdpbmFsRmV0Y2ggPSB3aW5kb3cuZmV0Y2g7XHJcblxyXG53aW5kb3cuZmV0Y2ggPSBmdW5jdGlvbiguLi5hcmdzKSB7XHJcblx0Y29uc3QgdXJsID0gYXJnc1swXSBpbnN0YW5jZW9mIFJlcXVlc3QgPyBhcmdzWzBdLnVybCA6IGFyZ3NbMF07XHJcblxyXG5cdC8vIFNraXAgV2ViU29ja2V0IFVSTHNcclxuXHRpZiAodXJsLnN0YXJ0c1dpdGgoJ3dzOicpIHx8IHVybC5zdGFydHNXaXRoKCd3c3M6JykpIHtcclxuXHRcdHJldHVybiBvcmlnaW5hbEZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncylcclxuXHRcdC50aGVuKGFzeW5jIHJlc3BvbnNlID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJyc7XHJcblxyXG5cdFx0XHQvLyBFeGNsdWRlIEhUTUwgZG9jdW1lbnQgcmVzcG9uc2VzXHJcblx0XHRcdGNvbnN0IGlzRG9jdW1lbnRSZXNwb25zZSA9XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvaHRtbCcpIHx8XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3hodG1sK3htbCcpO1xyXG5cclxuXHRcdFx0aWYgKCFyZXNwb25zZS5vayAmJiAhaXNEb2N1bWVudFJlc3BvbnNlKSB7XHJcblx0XHRcdFx0XHRjb25zdCByZXNwb25zZUNsb25lID0gcmVzcG9uc2UuY2xvbmUoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGVycm9yRnJvbVJlcyA9IGF3YWl0IHJlc3BvbnNlQ2xvbmUudGV4dCgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVxdWVzdFVybCA9IHJlc3BvbnNlLnVybDtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXFxgRmV0Y2ggZXJyb3IgZnJvbSBcXCR7cmVxdWVzdFVybH06IFxcJHtlcnJvckZyb21SZXN9XFxgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xyXG5cdFx0fSlcclxuXHRcdC5jYXRjaChlcnJvciA9PiB7XHJcblx0XHRcdGlmICghdXJsLm1hdGNoKC9cXC5odG1sPyQvaSkpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHR9KTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ05hdmlnYXRpb25IYW5kbGVyID0gYFxyXG5pZiAod2luZG93Lm5hdmlnYXRpb24gJiYgd2luZG93LnNlbGYgIT09IHdpbmRvdy50b3ApIHtcclxuXHR3aW5kb3cubmF2aWdhdGlvbi5hZGRFdmVudExpc3RlbmVyKCduYXZpZ2F0ZScsIChldmVudCkgPT4ge1xyXG5cdFx0Y29uc3QgdXJsID0gZXZlbnQuZGVzdGluYXRpb24udXJsO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGRlc3RpbmF0aW9uVXJsID0gbmV3IFVSTCh1cmwpO1xyXG5cdFx0XHRjb25zdCBkZXN0aW5hdGlvbk9yaWdpbiA9IGRlc3RpbmF0aW9uVXJsLm9yaWdpbjtcclxuXHRcdFx0Y29uc3QgY3VycmVudE9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XHJcblxyXG5cdFx0XHRpZiAoZGVzdGluYXRpb25PcmlnaW4gPT09IGN1cnJlbnRPcmlnaW4pIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0dHlwZTogJ2hvcml6b25zLW5hdmlnYXRpb24tZXJyb3InLFxyXG5cdFx0XHR1cmwsXHJcblx0XHR9LCAnKicpO1xyXG5cdH0pO1xyXG59XHJcbmA7XHJcblxyXG5jb25zdCBhZGRUcmFuc2Zvcm1JbmRleEh0bWwgPSB7XHJcblx0bmFtZTogJ2FkZC10cmFuc2Zvcm0taW5kZXgtaHRtbCcsXHJcblx0dHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcclxuXHRcdGNvbnN0IHRhZ3MgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXHJcblx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zUnVudGltZUVycm9ySGFuZGxlcixcclxuXHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGFnOiAnc2NyaXB0JyxcclxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIsXHJcblx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRhZzogJ3NjcmlwdCcsXHJcblx0XHRcdFx0YXR0cnM6IHt0eXBlOiAnbW9kdWxlJ30sXHJcblx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlcixcclxuXHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0dGFnOiAnc2NyaXB0JyxcclxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBjb25maWdXaW5kb3dGZXRjaE1vbmtleVBhdGNoLFxyXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXHJcblx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ05hdmlnYXRpb25IYW5kbGVyLFxyXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXHJcblx0XHRcdH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdGlmICghaXNEZXYgJiYgcHJvY2Vzcy5lbnYuVEVNUExBVEVfQkFOTkVSX1NDUklQVF9VUkwgJiYgcHJvY2Vzcy5lbnYuVEVNUExBVEVfUkVESVJFQ1RfVVJMKSB7XHJcblx0XHRcdHRhZ3MucHVzaChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0c3JjOiBwcm9jZXNzLmVudi5URU1QTEFURV9CQU5ORVJfU0NSSVBUX1VSTCxcclxuXHRcdFx0XHRcdFx0J3RlbXBsYXRlLXJlZGlyZWN0LXVybCc6IHByb2Nlc3MuZW52LlRFTVBMQVRFX1JFRElSRUNUX1VSTCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRodG1sLFxyXG5cdFx0XHR0YWdzLFxyXG5cdFx0fTtcclxuXHR9LFxyXG59O1xyXG5cclxuY29uc29sZS53YXJuID0gKCkgPT4ge307XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoKVxyXG5jb25zdCBsb2dnZXJFcnJvciA9IGxvZ2dlci5lcnJvclxyXG5cclxubG9nZ2VyLmVycm9yID0gKG1zZywgb3B0aW9ucykgPT4ge1xyXG5cdGlmIChvcHRpb25zPy5lcnJvcj8udG9TdHJpbmcoKS5pbmNsdWRlcygnQ3NzU3ludGF4RXJyb3I6IFtwb3N0Y3NzXScpKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRsb2dnZXJFcnJvcihtc2csIG9wdGlvbnMpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG5cdGN1c3RvbUxvZ2dlcjogbG9nZ2VyLFxyXG5cdHBsdWdpbnM6IFtcclxuXHRcdC4uLihpc0RldiA/IFtpbmxpbmVFZGl0UGx1Z2luKCksIGVkaXRNb2RlRGV2UGx1Z2luKCksIGlmcmFtZVJvdXRlUmVzdG9yYXRpb25QbHVnaW4oKV0gOiBbXSksXHJcblx0XHRyZWFjdCgpLFxyXG5cdFx0YWRkVHJhbnNmb3JtSW5kZXhIdG1sXHJcblx0XSxcclxuXHRzZXJ2ZXI6IHtcclxuXHRcdGNvcnM6IHRydWUsXHJcblx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdCdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ2NyZWRlbnRpYWxsZXNzJyxcclxuXHRcdH0sXHJcblx0XHRhbGxvd2VkSG9zdHM6IHRydWUsXHJcblx0XHRwcm94eToge1xyXG5cdFx0XHQnL2Z1bmN0aW9ucyc6IHtcclxuXHRcdFx0XHR0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxyXG5cdFx0XHRcdGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBNaWRkbGV3YXJlIHBhcmEgc2ltdWxhciBFZGdlIEZ1bmN0aW9ucyBlbSBkZXNlbnZvbHZpbWVudG9cclxuXHRcdFx0XHRcdHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHJlcS51cmwuaW5jbHVkZXMoJy9tcC1jcmVhdGUtcHJlZmVyZW5jZScpKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gSW50ZXJjZXB0YXIgZSByZXNwb25kZXIgY29tIG1vY2tcclxuXHRcdFx0XHRcdFx0XHRwcm94eS5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3Byb3h5UmVxJyk7XHJcblx0XHRcdFx0XHRcdFx0cHJveHkucmVtb3ZlQWxsTGlzdGVuZXJzKCdwcm94eVJlcycpO1xyXG5cdFx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdGxldCBib2R5ID0gJyc7XHJcblx0XHRcdFx0XHRcdFx0cmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xyXG5cdFx0XHRcdFx0XHRcdHJlcS5vbignZW5kJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGF0YSA9IEpTT04ucGFyc2UoYm9keSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdcdUQ4M0RcdUREMzUgW0RFVl0gTW9jayBNUCBQcmVmZXJlbmNlOicsIGRhdGEpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gU2ltdWxhciByZXNwb3N0YSBkbyBNZXJjYWRvIFBhZ29cclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpbml0X3BvaW50OiBgJHtwcm9jZXNzLmVudi5WSVRFX0FQUF9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCd9L3BhZ2FtZW50by1zaW11bGFkbz9ib29raW5nX2lkPSR7ZGF0YS5ib29raW5nX2lkfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0bXA6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlkOiAnbW9ja19wcmVmZXJlbmNlXycgKyBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aW5pdF9wb2ludDogYCR7cHJvY2Vzcy5lbnYuVklURV9BUFBfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnfS9wYWdhbWVudG8tc2ltdWxhZG8/Ym9va2luZ19pZD0ke2RhdGEuYm9va2luZ19pZH1gXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9KSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTW9jayBNUCBlcnJvcicsIGRldGFpbHM6IGVyci5tZXNzYWdlIH0pKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRyZXNvbHZlOiB7XHJcblx0XHRleHRlbnNpb25zOiBbJy5qc3gnLCAnLmpzJywgJy50c3gnLCAnLnRzJywgJy5qc29uJywgXSxcclxuXHRcdGFsaWFzOiB7XHJcblx0XHRcdCdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcblx0XHR9LFxyXG5cdH0sXHJcblx0YnVpbGQ6IHtcclxuXHRcdHJvbGx1cE9wdGlvbnM6IHtcclxuXHRcdFx0ZXh0ZXJuYWw6IFtcclxuXHRcdFx0XHQnQGJhYmVsL3BhcnNlcicsXHJcblx0XHRcdFx0J0BiYWJlbC90cmF2ZXJzZScsXHJcblx0XHRcdFx0J0BiYWJlbC9nZW5lcmF0b3InLFxyXG5cdFx0XHRcdCdAYmFiZWwvdHlwZXMnXHJcblx0XHRcdF1cclxuXHRcdH1cclxuXHR9XHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFuZGVyXFxcXHNvdXJjZVxcXFxyZXBvc1xcXFxmcm9udGVuZF9kb3hvbG9nb3NcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbmRlclxcXFxzb3VyY2VcXFxccmVwb3NcXFxcZnJvbnRlbmRfZG94b2xvZ29zXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXRlLXBsdWdpbi1yZWFjdC1pbmxpbmUtZWRpdG9yLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9hbmRlci9zb3VyY2UvcmVwb3MvZnJvbnRlbmRfZG94b2xvZ29zL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1yZWFjdC1pbmxpbmUtZWRpdG9yLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ0BiYWJlbC9wYXJzZXInO1xyXG5pbXBvcnQgdHJhdmVyc2VCYWJlbCBmcm9tICdAYmFiZWwvdHJhdmVyc2UnO1xyXG5pbXBvcnQgZ2VuZXJhdGUgZnJvbSAnQGJhYmVsL2dlbmVyYXRvcic7XHJcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGJhYmVsL3R5cGVzJztcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuXHJcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcclxuY29uc3QgVklURV9QUk9KRUNUX1JPT1QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKTtcclxuY29uc3QgRURJVEFCTEVfSFRNTF9UQUdTID0gW1wiYVwiLCBcIkJ1dHRvblwiLCBcImJ1dHRvblwiLCBcInBcIiwgXCJzcGFuXCIsIFwiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIiwgXCJoNVwiLCBcImg2XCIsIFwibGFiZWxcIiwgXCJMYWJlbFwiLCBcImltZ1wiXTtcclxuXHJcbmZ1bmN0aW9uIHBhcnNlRWRpdElkKGVkaXRJZCkge1xyXG4gIGNvbnN0IHBhcnRzID0gZWRpdElkLnNwbGl0KCc6Jyk7XHJcblxyXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNvbHVtbiA9IHBhcnNlSW50KHBhcnRzLmF0KC0xKSwgMTApO1xyXG4gIGNvbnN0IGxpbmUgPSBwYXJzZUludChwYXJ0cy5hdCgtMiksIDEwKTtcclxuICBjb25zdCBmaWxlUGF0aCA9IHBhcnRzLnNsaWNlKDAsIC0yKS5qb2luKCc6Jyk7XHJcblxyXG4gIGlmICghZmlsZVBhdGggfHwgaXNOYU4obGluZSkgfHwgaXNOYU4oY29sdW1uKSkge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyBmaWxlUGF0aCwgbGluZSwgY29sdW1uIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrVGFnTmFtZUVkaXRhYmxlKG9wZW5pbmdFbGVtZW50Tm9kZSwgZWRpdGFibGVUYWdzTGlzdCkge1xyXG4gICAgaWYgKCFvcGVuaW5nRWxlbWVudE5vZGUgfHwgIW9wZW5pbmdFbGVtZW50Tm9kZS5uYW1lKSByZXR1cm4gZmFsc2U7XHJcbiAgICBjb25zdCBuYW1lTm9kZSA9IG9wZW5pbmdFbGVtZW50Tm9kZS5uYW1lO1xyXG5cclxuICAgIC8vIENoZWNrIDE6IERpcmVjdCBuYW1lIChmb3IgPHA+LCA8QnV0dG9uPilcclxuICAgIGlmIChuYW1lTm9kZS50eXBlID09PSAnSlNYSWRlbnRpZmllcicgJiYgZWRpdGFibGVUYWdzTGlzdC5pbmNsdWRlcyhuYW1lTm9kZS5uYW1lKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIDI6IFByb3BlcnR5IG5hbWUgb2YgYSBtZW1iZXIgZXhwcmVzc2lvbiAoZm9yIDxtb3Rpb24uaDE+LCBjaGVjayBpZiBcImgxXCIgaXMgaW4gZWRpdGFibGVUYWdzTGlzdClcclxuICAgIGlmIChuYW1lTm9kZS50eXBlID09PSAnSlNYTWVtYmVyRXhwcmVzc2lvbicgJiYgbmFtZU5vZGUucHJvcGVydHkgJiYgbmFtZU5vZGUucHJvcGVydHkudHlwZSA9PT0gJ0pTWElkZW50aWZpZXInICYmIGVkaXRhYmxlVGFnc0xpc3QuaW5jbHVkZXMobmFtZU5vZGUucHJvcGVydHkubmFtZSkpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlSW1hZ2VTcmMob3BlbmluZ05vZGUpIHtcclxuICAgIGlmICghb3BlbmluZ05vZGUgfHwgIW9wZW5pbmdOb2RlLm5hbWUgfHwgb3BlbmluZ05vZGUubmFtZS5uYW1lICE9PSAnaW1nJykge1xyXG4gICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IHRydWUsIHJlYXNvbjogbnVsbCB9OyAvLyBOb3QgYW4gaW1hZ2UsIHNraXAgdmFsaWRhdGlvblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGhhc1Byb3BzU3ByZWFkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKGF0dHIgPT5cclxuICAgICAgICB0LmlzSlNYU3ByZWFkQXR0cmlidXRlKGF0dHIpICYmXHJcbiAgICAgICAgYXR0ci5hcmd1bWVudCAmJlxyXG4gICAgICAgIHQuaXNJZGVudGlmaWVyKGF0dHIuYXJndW1lbnQpICYmXHJcbiAgICAgICAgYXR0ci5hcmd1bWVudC5uYW1lID09PSAncHJvcHMnXHJcbiAgICApO1xyXG5cclxuICAgIGlmIChoYXNQcm9wc1NwcmVhZCkge1xyXG4gICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCByZWFzb246ICdwcm9wcy1zcHJlYWQnIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc3JjQXR0ciA9IG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMuZmluZChhdHRyID0+XHJcbiAgICAgICAgdC5pc0pTWEF0dHJpYnV0ZShhdHRyKSAmJlxyXG4gICAgICAgIGF0dHIubmFtZSAmJlxyXG4gICAgICAgIGF0dHIubmFtZS5uYW1lID09PSAnc3JjJ1xyXG4gICAgKTtcclxuXHJcbiAgICBpZiAoIXNyY0F0dHIpIHtcclxuICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgcmVhc29uOiAnbWlzc2luZy1zcmMnIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0LmlzU3RyaW5nTGl0ZXJhbChzcmNBdHRyLnZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCByZWFzb246ICdkeW5hbWljLXNyYycgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXNyY0F0dHIudmFsdWUudmFsdWUgfHwgc3JjQXR0ci52YWx1ZS52YWx1ZS50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIHJlYXNvbjogJ2VtcHR5LXNyYycgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBpc1ZhbGlkOiB0cnVlLCByZWFzb246IG51bGwgfTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdFBsdWdpbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ3ZpdGUtaW5saW5lLWVkaXQtcGx1Z2luJyxcclxuICAgIGVuZm9yY2U6ICdwcmUnLFxyXG5cclxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xyXG4gICAgICBpZiAoIS9cXC4oanN4fHRzeCkkLy50ZXN0KGlkKSB8fCAhaWQuc3RhcnRzV2l0aChWSVRFX1BST0pFQ1RfUk9PVCkgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlbGF0aXZlRmlsZVBhdGggPSBwYXRoLnJlbGF0aXZlKFZJVEVfUFJPSkVDVF9ST09ULCBpZCk7XHJcbiAgICAgIGNvbnN0IHdlYlJlbGF0aXZlRmlsZVBhdGggPSByZWxhdGl2ZUZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGJhYmVsQXN0ID0gcGFyc2UoY29kZSwge1xyXG4gICAgICAgICAgc291cmNlVHlwZTogJ21vZHVsZScsXHJcbiAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXHJcbiAgICAgICAgICBlcnJvclJlY292ZXJ5OiB0cnVlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGxldCBhdHRyaWJ1dGVzQWRkZWQgPSAwO1xyXG5cclxuICAgICAgICB0cmF2ZXJzZUJhYmVsLmRlZmF1bHQoYmFiZWxBc3QsIHtcclxuICAgICAgICAgIGVudGVyKHBhdGgpIHtcclxuICAgICAgICAgICAgaWYgKHBhdGguaXNKU1hPcGVuaW5nRWxlbWVudCgpKSB7XHJcbiAgICAgICAgICAgICAgY29uc3Qgb3BlbmluZ05vZGUgPSBwYXRoLm5vZGU7XHJcbiAgICAgICAgICAgICAgY29uc3QgZWxlbWVudE5vZGUgPSBwYXRoLnBhcmVudFBhdGgubm9kZTsgLy8gVGhlIEpTWEVsZW1lbnQgaXRzZWxmXHJcblxyXG4gICAgICAgICAgICAgIGlmICghb3BlbmluZ05vZGUubG9jKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBjb25zdCBhbHJlYWR5SGFzSWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoXHJcbiAgICAgICAgICAgICAgICAoYXR0cikgPT4gdC5pc0pTWEF0dHJpYnV0ZShhdHRyKSAmJiBhdHRyLm5hbWUubmFtZSA9PT0gJ2RhdGEtZWRpdC1pZCdcclxuICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoYWxyZWFkeUhhc0lkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gMTogSXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0YWcgdHlwZSBlZGl0YWJsZT9cclxuICAgICAgICAgICAgICBjb25zdCBpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUgPSBjaGVja1RhZ05hbWVFZGl0YWJsZShvcGVuaW5nTm9kZSwgRURJVEFCTEVfSFRNTF9UQUdTKTtcclxuICAgICAgICAgICAgICBpZiAoIWlzQ3VycmVudEVsZW1lbnRFZGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgY29uc3QgaW1hZ2VWYWxpZGF0aW9uID0gdmFsaWRhdGVJbWFnZVNyYyhvcGVuaW5nTm9kZSk7XHJcbiAgICAgICAgICAgICAgaWYgKCFpbWFnZVZhbGlkYXRpb24uaXNWYWxpZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcclxuICAgICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtZGlzYWJsZWQnKSxcclxuICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKCd0cnVlJylcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xyXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlc0FkZGVkKys7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDI6IERvZXMgdGhlIGVsZW1lbnQgaGF2ZSBkeW5hbWljIG9yIGVkaXRhYmxlIGNoaWxkcmVuXHJcbiAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudCBoYXMgey4uLnByb3BzfSBzcHJlYWQgYXR0cmlidXRlIC0gZGlzYWJsZSBlZGl0aW5nIGlmIGl0IGRvZXNcclxuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1Byb3BzU3ByZWFkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKGF0dHIgPT4gdC5pc0pTWFNwcmVhZEF0dHJpYnV0ZShhdHRyKVxyXG4gICAgICAgICAgICAgICAgJiYgYXR0ci5hcmd1bWVudFxyXG4gICAgICAgICAgICAgICAgJiYgdC5pc0lkZW50aWZpZXIoYXR0ci5hcmd1bWVudClcclxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQubmFtZSA9PT0gJ3Byb3BzJ1xyXG4gICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNEeW5hbWljQ2hpbGQgPSBlbGVtZW50Tm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+XHJcbiAgICAgICAgICAgICAgICAgIHQuaXNKU1hFeHByZXNzaW9uQ29udGFpbmVyKGNoaWxkKVxyXG4gICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzRHluYW1pY0NoaWxkIHx8IGhhc1Byb3BzU3ByZWFkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmICghc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gJiYgdC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNFZGl0YWJsZUpzeENoaWxkID0gZWxlbWVudE5vZGUuY2hpbGRyZW4uc29tZShjaGlsZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUyk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChoYXNFZGl0YWJsZUpzeENoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmIChzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcclxuICAgICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtZGlzYWJsZWQnKSxcclxuICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKCd0cnVlJylcclxuICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGRpc2FibGVkQXR0cmlidXRlKTtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNBZGRlZCsrO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDM6IFBhcmVudCBpcyBub24tZWRpdGFibGUgaWYgQVQgTEVBU1QgT05FIGNoaWxkIEpTWEVsZW1lbnQgaXMgYSBub24tZWRpdGFibGUgdHlwZS5cclxuICAgICAgICAgICAgICBpZiAodC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgbGV0IGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzTm9uRWRpdGFibGVKc3hDaGlsZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAoaGFzTm9uRWRpdGFibGVKc3hDaGlsZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtZGlzYWJsZWQnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKFwidHJ1ZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgIG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChkaXNhYmxlZEF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcclxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDQ6IElzIGFueSBhbmNlc3RvciBKU1hFbGVtZW50IGFsc28gZWRpdGFibGU/XHJcbiAgICAgICAgICAgICAgbGV0IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGggPSBwYXRoLnBhcmVudFBhdGgucGFyZW50UGF0aDtcclxuICAgICAgICAgICAgICB3aGlsZSAoY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBhbmNlc3RvckpzeEVsZW1lbnRQYXRoID0gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5pc0pTWEVsZW1lbnQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgPyBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgICA6IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGguZmluZFBhcmVudChwID0+IHAuaXNKU1hFbGVtZW50KCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFhbmNlc3RvckpzeEVsZW1lbnRQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKGNoZWNrVGFnTmFtZUVkaXRhYmxlKGFuY2VzdG9ySnN4RWxlbWVudFBhdGgubm9kZS5vcGVuaW5nRWxlbWVudCwgRURJVEFCTEVfSFRNTF9UQUdTKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGggPSBhbmNlc3RvckpzeEVsZW1lbnRQYXRoLnBhcmVudFBhdGg7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBjb25zdCBsaW5lID0gb3BlbmluZ05vZGUubG9jLnN0YXJ0LmxpbmU7XHJcbiAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gb3BlbmluZ05vZGUubG9jLnN0YXJ0LmNvbHVtbiArIDE7XHJcbiAgICAgICAgICAgICAgY29uc3QgZWRpdElkID0gYCR7d2ViUmVsYXRpdmVGaWxlUGF0aH06JHtsaW5lfToke2NvbHVtbn1gO1xyXG5cclxuICAgICAgICAgICAgICBjb25zdCBpZEF0dHJpYnV0ZSA9IHQuanN4QXR0cmlidXRlKFxyXG4gICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtaWQnKSxcclxuICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChlZGl0SWQpXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGlkQXR0cmlidXRlKTtcclxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoYXR0cmlidXRlc0FkZGVkID4gMCkge1xyXG4gICAgICAgICAgY29uc3QgZ2VuZXJhdGVGdW5jdGlvbiA9IGdlbmVyYXRlLmRlZmF1bHQgfHwgZ2VuZXJhdGU7XHJcbiAgICAgICAgICBjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKGJhYmVsQXN0LCB7XHJcbiAgICAgICAgICAgIHNvdXJjZU1hcHM6IHRydWUsXHJcbiAgICAgICAgICAgIHNvdXJjZUZpbGVOYW1lOiB3ZWJSZWxhdGl2ZUZpbGVQYXRoXHJcbiAgICAgICAgICB9LCBjb2RlKTtcclxuXHJcbiAgICAgICAgICByZXR1cm4geyBjb2RlOiBvdXRwdXQuY29kZSwgbWFwOiBvdXRwdXQubWFwIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBbdml0ZV1bdmlzdWFsLWVkaXRvcl0gRXJyb3IgdHJhbnNmb3JtaW5nICR7aWR9OmAsIGVycm9yKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgLy8gVXBkYXRlcyBzb3VyY2UgY29kZSBiYXNlZCBvbiB0aGUgY2hhbmdlcyByZWNlaXZlZCBmcm9tIHRoZSBjbGllbnRcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcHBseS1lZGl0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XHJcblxyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgbGV0IGFic29sdXRlRmlsZVBhdGggPSAnJztcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZWRpdElkLCBuZXdGdWxsVGV4dCB9ID0gSlNPTi5wYXJzZShib2R5KTtcclxuXHJcbiAgICAgICAgICAgIGlmICghZWRpdElkIHx8IHR5cGVvZiBuZXdGdWxsVGV4dCA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIGVkaXRJZCBvciBuZXdGdWxsVGV4dCcgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBwYXJzZWRJZCA9IHBhcnNlRWRpdElkKGVkaXRJZCk7XHJcbiAgICAgICAgICAgIGlmICghcGFyc2VkSWQpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIGVkaXRJZCBmb3JtYXQgKGZpbGVQYXRoOmxpbmU6Y29sdW1uKScgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfSA9IHBhcnNlZElkO1xyXG5cclxuICAgICAgICAgICAgYWJzb2x1dGVGaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShWSVRFX1BST0pFQ1RfUk9PVCwgZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguaW5jbHVkZXMoJy4uJykgfHwgIWFic29sdXRlRmlsZVBhdGguc3RhcnRzV2l0aChWSVRFX1BST0pFQ1RfUk9PVCkgfHwgYWJzb2x1dGVGaWxlUGF0aC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHBhdGgnIH0pKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgsICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYmFiZWxBc3QgPSBwYXJzZShvcmlnaW5hbENvbnRlbnQsIHtcclxuICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcclxuICAgICAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXHJcbiAgICAgICAgICAgICAgZXJyb3JSZWNvdmVyeTogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0YXJnZXROb2RlUGF0aCA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0b3IgPSB7XHJcbiAgICAgICAgICAgICAgSlNYT3BlbmluZ0VsZW1lbnQocGF0aCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHBhdGgubm9kZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmxvYyAmJiBub2RlLmxvYy5zdGFydC5saW5lID09PSBsaW5lICYmIG5vZGUubG9jLnN0YXJ0LmNvbHVtbiArIDEgPT09IGNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICB0YXJnZXROb2RlUGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgICAgICAgIHBhdGguc3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdHJhdmVyc2VCYWJlbC5kZWZhdWx0KGJhYmVsQXN0LCB2aXNpdG9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZVBhdGgpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdUYXJnZXQgbm9kZSBub3QgZm91bmQgYnkgbGluZS9jb2x1bW4nLCBlZGl0SWQgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0T3BlbmluZ0VsZW1lbnQgPSB0YXJnZXROb2RlUGF0aC5ub2RlO1xyXG4gICAgICAgICAgICBjb25zdCBwYXJlbnRFbGVtZW50Tm9kZSA9IHRhcmdldE5vZGVQYXRoLnBhcmVudFBhdGg/Lm5vZGU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpc0ltYWdlRWxlbWVudCA9IHRhcmdldE9wZW5pbmdFbGVtZW50Lm5hbWUgJiYgdGFyZ2V0T3BlbmluZ0VsZW1lbnQubmFtZS5uYW1lID09PSAnaW1nJztcclxuXHJcbiAgICAgICAgICAgIGxldCBiZWZvcmVDb2RlID0gJyc7XHJcbiAgICAgICAgICAgIGxldCBhZnRlckNvZGUgPSAnJztcclxuICAgICAgICAgICAgbGV0IG1vZGlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNJbWFnZUVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAvLyBIYW5kbGUgaW1hZ2Ugc3JjIGF0dHJpYnV0ZSB1cGRhdGVcclxuICAgICAgICAgICAgICBjb25zdCBiZWZvcmVPdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKHRhcmdldE9wZW5pbmdFbGVtZW50LCB7fSk7XHJcbiAgICAgICAgICAgICAgYmVmb3JlQ29kZSA9IGJlZm9yZU91dHB1dC5jb2RlO1xyXG5cclxuICAgICAgICAgICAgICBjb25zdCBzcmNBdHRyID0gdGFyZ2V0T3BlbmluZ0VsZW1lbnQuYXR0cmlidXRlcy5maW5kKGF0dHIgPT5cclxuICAgICAgICAgICAgICAgIHQuaXNKU1hBdHRyaWJ1dGUoYXR0cikgJiYgYXR0ci5uYW1lICYmIGF0dHIubmFtZS5uYW1lID09PSAnc3JjJ1xyXG4gICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChzcmNBdHRyICYmIHQuaXNTdHJpbmdMaXRlcmFsKHNyY0F0dHIudmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICBzcmNBdHRyLnZhbHVlID0gdC5zdHJpbmdMaXRlcmFsKG5ld0Z1bGxUZXh0KTtcclxuICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhZnRlck91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24odGFyZ2V0T3BlbmluZ0VsZW1lbnQsIHt9KTtcclxuICAgICAgICAgICAgICAgIGFmdGVyQ29kZSA9IGFmdGVyT3V0cHV0LmNvZGU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGlmIChwYXJlbnRFbGVtZW50Tm9kZSAmJiB0LmlzSlNYRWxlbWVudChwYXJlbnRFbGVtZW50Tm9kZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZU91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24ocGFyZW50RWxlbWVudE5vZGUsIHt9KTtcclxuICAgICAgICAgICAgICAgIGJlZm9yZUNvZGUgPSBiZWZvcmVPdXRwdXQuY29kZTtcclxuXHJcbiAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbiA9IFtdO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0Z1bGxUZXh0ICYmIG5ld0Z1bGxUZXh0LnRyaW0oKSAhPT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VGV4dE5vZGUgPSB0LmpzeFRleHQobmV3RnVsbFRleHQpO1xyXG4gICAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5ld1RleHROb2RlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhZnRlck91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24ocGFyZW50RWxlbWVudE5vZGUsIHt9KTtcclxuICAgICAgICAgICAgICAgIGFmdGVyQ29kZSA9IGFmdGVyT3V0cHV0LmNvZGU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIW1vZGlmaWVkKSB7XHJcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDksIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQ291bGQgbm90IGFwcGx5IGNoYW5nZXMgdG8gQVNULicgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKGJhYmVsQXN0LCB7fSk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBvdXRwdXQuY29kZTtcclxuXHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG5ld0ZpbGVDb250ZW50OiBuZXdDb250ZW50LFxyXG4gICAgICAgICAgICAgICAgYmVmb3JlQ29kZSxcclxuICAgICAgICAgICAgICAgIGFmdGVyQ29kZSxcclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgZWRpdCBhcHBsaWNhdGlvbi4nIH0pKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYW5kZXJcXFxcc291cmNlXFxcXHJlcG9zXFxcXGZyb250ZW5kX2RveG9sb2dvc1xcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFuZGVyXFxcXHNvdXJjZVxcXFxyZXBvc1xcXFxmcm9udGVuZF9kb3hvbG9nb3NcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYW5kZXIvc291cmNlL3JlcG9zL2Zyb250ZW5kX2RveG9sb2dvcy9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzXCI7aW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBFRElUX01PREVfU1RZTEVTIH0gZnJvbSAnLi92aXN1YWwtZWRpdG9yLWNvbmZpZy5qcyc7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSByZXNvbHZlKF9fZmlsZW5hbWUsICcuLicpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdERldlBsdWdpbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ3ZpdGU6aW5saW5lLWVkaXQtZGV2JyxcclxuICAgIGFwcGx5OiAnc2VydmUnLFxyXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKCkge1xyXG4gICAgICBjb25zdCBzY3JpcHRQYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdlZGl0LW1vZGUtc2NyaXB0LmpzJyk7XHJcbiAgICAgIGNvbnN0IHNjcmlwdENvbnRlbnQgPSByZWFkRmlsZVN5bmMoc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XHJcblxyXG4gICAgICByZXR1cm4gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHRhZzogJ3NjcmlwdCcsXHJcbiAgICAgICAgICBhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG4gICAgICAgICAgY2hpbGRyZW46IHNjcmlwdENvbnRlbnQsXHJcbiAgICAgICAgICBpbmplY3RUbzogJ2JvZHknXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0YWc6ICdzdHlsZScsXHJcbiAgICAgICAgICBjaGlsZHJlbjogRURJVF9NT0RFX1NUWUxFUyxcclxuICAgICAgICAgIGluamVjdFRvOiAnaGVhZCdcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFuZGVyXFxcXHNvdXJjZVxcXFxyZXBvc1xcXFxmcm9udGVuZF9kb3hvbG9nb3NcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbmRlclxcXFxzb3VyY2VcXFxccmVwb3NcXFxcZnJvbnRlbmRfZG94b2xvZ29zXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXN1YWwtZWRpdG9yLWNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYW5kZXIvc291cmNlL3JlcG9zL2Zyb250ZW5kX2RveG9sb2dvcy9wbHVnaW5zL3Zpc3VhbC1lZGl0b3IvdmlzdWFsLWVkaXRvci1jb25maWcuanNcIjtleHBvcnQgY29uc3QgUE9QVVBfU1RZTEVTID0gYFxyXG4jaW5saW5lLWVkaXRvci1wb3B1cCB7XHJcbiAgd2lkdGg6IDM2MHB4O1xyXG4gIHBvc2l0aW9uOiBmaXhlZDtcclxuICB6LWluZGV4OiAxMDAwMDtcclxuICBiYWNrZ3JvdW5kOiAjMTYxNzE4O1xyXG4gIGNvbG9yOiB3aGl0ZTtcclxuICBib3JkZXI6IDFweCBzb2xpZCAjNGE1NTY4O1xyXG4gIGJvcmRlci1yYWRpdXM6IDE2cHg7XHJcbiAgcGFkZGluZzogOHB4O1xyXG4gIGJveC1zaGFkb3c6IDAgNHB4IDEycHggcmdiYSgwLDAsMCwwLjIpO1xyXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgZ2FwOiAxMHB4O1xyXG4gIGRpc3BsYXk6IG5vbmU7XHJcbn1cclxuXHJcbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xyXG4gICNpbmxpbmUtZWRpdG9yLXBvcHVwIHtcclxuICAgIHdpZHRoOiBjYWxjKDEwMCUgLSAyMHB4KTtcclxuICB9XHJcbn1cclxuXHJcbiNpbmxpbmUtZWRpdG9yLXBvcHVwLmlzLWFjdGl2ZSB7XHJcbiAgZGlzcGxheTogZmxleDtcclxuICB0b3A6IDUwJTtcclxuICBsZWZ0OiA1MCU7XHJcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XHJcbn1cclxuXHJcbiNpbmxpbmUtZWRpdG9yLXBvcHVwLmlzLWRpc2FibGVkLXZpZXcge1xyXG4gIHBhZGRpbmc6IDEwcHggMTVweDtcclxufVxyXG5cclxuI2lubGluZS1lZGl0b3ItcG9wdXAgdGV4dGFyZWEge1xyXG4gIGhlaWdodDogMTAwcHg7XHJcbiAgcGFkZGluZzogNHB4IDhweDtcclxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcclxuICBjb2xvcjogd2hpdGU7XHJcbiAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgZm9udC1zaXplOiAwLjg3NXJlbTtcclxuICBsaW5lLWhlaWdodDogMS40MjtcclxuICByZXNpemU6IG5vbmU7XHJcbiAgb3V0bGluZTogbm9uZTtcclxufVxyXG5cclxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmJ1dHRvbi1jb250YWluZXIge1xyXG4gIGRpc3BsYXk6IGZsZXg7XHJcbiAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcclxuICBnYXA6IDEwcHg7XHJcbn1cclxuXHJcbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5wb3B1cC1idXR0b24ge1xyXG4gIGJvcmRlcjogbm9uZTtcclxuICBwYWRkaW5nOiA2cHggMTZweDtcclxuICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgY3Vyc29yOiBwb2ludGVyO1xyXG4gIGZvbnQtc2l6ZTogMC43NXJlbTtcclxuICBmb250LXdlaWdodDogNzAwO1xyXG4gIGhlaWdodDogMzRweDtcclxuICBvdXRsaW5lOiBub25lO1xyXG59XHJcblxyXG4jaW5saW5lLWVkaXRvci1wb3B1cCAuc2F2ZS1idXR0b24ge1xyXG4gIGJhY2tncm91bmQ6ICM2NzNkZTY7XHJcbiAgY29sb3I6IHdoaXRlO1xyXG59XHJcblxyXG4jaW5saW5lLWVkaXRvci1wb3B1cCAuY2FuY2VsLWJ1dHRvbiB7XHJcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XHJcbiAgYm9yZGVyOiAxcHggc29saWQgIzNiM2Q0YTtcclxuICBjb2xvcjogd2hpdGU7XHJcblxyXG4gICY6aG92ZXIge1xyXG4gICAgYmFja2dyb3VuZDojNDc0OTU4O1xyXG4gIH1cclxufVxyXG5gO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFBvcHVwSFRNTFRlbXBsYXRlKHNhdmVMYWJlbCwgY2FuY2VsTGFiZWwpIHtcclxuICByZXR1cm4gYFxyXG4gICAgPHRleHRhcmVhPjwvdGV4dGFyZWE+XHJcbiAgICA8ZGl2IGNsYXNzPVwiYnV0dG9uLWNvbnRhaW5lclwiPlxyXG4gICAgICA8YnV0dG9uIGNsYXNzPVwicG9wdXAtYnV0dG9uIGNhbmNlbC1idXR0b25cIj4ke2NhbmNlbExhYmVsfTwvYnV0dG9uPlxyXG4gICAgICA8YnV0dG9uIGNsYXNzPVwicG9wdXAtYnV0dG9uIHNhdmUtYnV0dG9uXCI+JHtzYXZlTGFiZWx9PC9idXR0b24+XHJcbiAgICA8L2Rpdj5cclxuICBgO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IEVESVRfTU9ERV9TVFlMRVMgPSBgXHJcbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0gW2RhdGEtZWRpdC1pZF0ge1xyXG4gICAgY3Vyc29yOiBwb2ludGVyOyBcclxuICAgIG91dGxpbmU6IDJweCBkYXNoZWQgIzM1N0RGOTsgXHJcbiAgICBvdXRsaW5lLW9mZnNldDogMnB4O1xyXG4gICAgbWluLWhlaWdodDogMWVtO1xyXG4gIH1cclxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSBpbWdbZGF0YS1lZGl0LWlkXSB7XHJcbiAgICBvdXRsaW5lLW9mZnNldDogLTJweDtcclxuICB9XHJcbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0ge1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gIH1cclxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSBbZGF0YS1lZGl0LWlkXTpob3ZlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzU3REY5MzM7XHJcbiAgICBvdXRsaW5lLWNvbG9yOiAjMzU3REY5OyBcclxuICB9XHJcblxyXG4gIEBrZXlmcmFtZXMgZmFkZUluVG9vbHRpcCB7XHJcbiAgICBmcm9tIHtcclxuICAgICAgb3BhY2l0eTogMDtcclxuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDVweCk7XHJcbiAgICB9XHJcbiAgICB0byB7XHJcbiAgICAgIG9wYWNpdHk6IDE7XHJcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAge1xyXG4gICAgZGlzcGxheTogbm9uZTsgXHJcbiAgICBvcGFjaXR5OiAwOyBcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIGJhY2tncm91bmQtY29sb3I6ICMxRDFFMjA7XHJcbiAgICBjb2xvcjogd2hpdGU7XHJcbiAgICBwYWRkaW5nOiA0cHggOHB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgei1pbmRleDogMTAwMDE7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjM0IzRDRBO1xyXG4gICAgbWF4LXdpZHRoOiAxODRweDtcclxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICB9XHJcblxyXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAudG9vbHRpcC1hY3RpdmUge1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBhbmltYXRpb246IGZhZGVJblRvb2x0aXAgMC4ycyBlYXNlLW91dCBmb3J3YXJkcztcclxuICB9XHJcbmA7IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbmRlclxcXFxzb3VyY2VcXFxccmVwb3NcXFxcZnJvbnRlbmRfZG94b2xvZ29zXFxcXHBsdWdpbnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFuZGVyXFxcXHNvdXJjZVxcXFxyZXBvc1xcXFxmcm9udGVuZF9kb3hvbG9nb3NcXFxccGx1Z2luc1xcXFx2aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FuZGVyL3NvdXJjZS9yZXBvcy9mcm9udGVuZF9kb3hvbG9nb3MvcGx1Z2lucy92aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanNcIjtleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpZnJhbWVSb3V0ZVJlc3RvcmF0aW9uUGx1Z2luKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAndml0ZTppZnJhbWUtcm91dGUtcmVzdG9yYXRpb24nLFxyXG4gICAgYXBwbHk6ICdzZXJ2ZScsXHJcbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoKSB7XHJcbiAgICAgIGNvbnN0IHNjcmlwdCA9IGBcclxuICAgICAgY29uc3QgQUxMT1dFRF9QQVJFTlRfT1JJR0lOUyA9IFtcclxuICAgICAgICAgIFwiaHR0cHM6Ly9ob3Jpem9ucy5ob3N0aW5nZXIuY29tXCIsXHJcbiAgICAgICAgICBcImh0dHBzOi8vaG9yaXpvbnMuaG9zdGluZ2VyLmRldlwiLFxyXG4gICAgICAgICAgXCJodHRwczovL2hvcml6b25zLWZyb250ZW5kLWxvY2FsLmhvc3Rpbmdlci5kZXZcIixcclxuICAgICAgXTtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBwYWdlIGlzIGluIGFuIGlmcmFtZVxyXG4gICAgICAgIGlmICh3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcCkge1xyXG4gICAgICAgICAgY29uc3QgU1RPUkFHRV9LRVkgPSAnaG9yaXpvbnMtaWZyYW1lLXNhdmVkLXJvdXRlJztcclxuXHJcbiAgICAgICAgICBjb25zdCBnZXRDdXJyZW50Um91dGUgPSAoKSA9PiBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCArIGxvY2F0aW9uLmhhc2g7XHJcblxyXG4gICAgICAgICAgY29uc3Qgc2F2ZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Um91dGUgPSBnZXRDdXJyZW50Um91dGUoKTtcclxuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBjdXJyZW50Um91dGUpO1xyXG4gICAgICAgICAgICAgIHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe21lc3NhZ2U6ICdyb3V0ZS1jaGFuZ2VkJywgcm91dGU6IGN1cnJlbnRSb3V0ZX0sICcqJyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge31cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVwbGFjZUhpc3RvcnlTdGF0ZSA9ICh1cmwpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCAnJywgdXJsKTtcclxuICAgICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlOiBoaXN0b3J5LnN0YXRlIH0pKTtcclxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3RvcmUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgY29uc3Qgc2F2ZWQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcclxuICAgICAgICAgICAgICBpZiAoIXNhdmVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgIGlmICghc2F2ZWQuc3RhcnRzV2l0aCgnLycpKSB7XHJcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKFNUT1JBR0VfS0VZKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBnZXRDdXJyZW50Um91dGUoKTtcclxuICAgICAgICAgICAgICBpZiAoY3VycmVudCAhPT0gc2F2ZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVwbGFjZUhpc3RvcnlTdGF0ZShzYXZlZCkpIHtcclxuICAgICAgICAgICAgICAgICAgcmVwbGFjZUhpc3RvcnlTdGF0ZSgnLycpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gKGRvY3VtZW50LmJvZHk/LmlubmVyVGV4dCB8fCAnJykudHJpbSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmVzdG9yZWQgcm91dGUgcmVzdWx0cyBpbiB0b28gbGl0dGxlIGNvbnRlbnQsIGFzc3VtZSBpdCBpcyBpbnZhbGlkIGFuZCBuYXZpZ2F0ZSBob21lXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQubGVuZ3RoIDwgNTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VIaXN0b3J5U3RhdGUoJy8nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge31cclxuICAgICAgICAgICAgICAgIH0sIDEwMDApKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge31cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY29uc3Qgb3JpZ2luYWxQdXNoU3RhdGUgPSBoaXN0b3J5LnB1c2hTdGF0ZTtcclxuICAgICAgICAgIGhpc3RvcnkucHVzaFN0YXRlID0gZnVuY3Rpb24oLi4uYXJncykge1xyXG4gICAgICAgICAgICBvcmlnaW5hbFB1c2hTdGF0ZS5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICAgICAgc2F2ZSgpO1xyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBjb25zdCBvcmlnaW5hbFJlcGxhY2VTdGF0ZSA9IGhpc3RvcnkucmVwbGFjZVN0YXRlO1xyXG4gICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUgPSBmdW5jdGlvbiguLi5hcmdzKSB7XHJcbiAgICAgICAgICAgIG9yaWdpbmFsUmVwbGFjZVN0YXRlLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgICAgICBzYXZlKCk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IGdldFBhcmVudE9yaWdpbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5hbmNlc3Rvck9yaWdpbnMgJiZcclxuICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmFuY2VzdG9yT3JpZ2lucy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24uYW5jZXN0b3JPcmlnaW5zWzBdO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlZmVycmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVSTChkb2N1bWVudC5yZWZlcnJlcikub3JpZ2luO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJJbnZhbGlkIHJlZmVycmVyIFVSTDpcIiwgZG9jdW1lbnQucmVmZXJyZXIpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgc2F2ZSk7XHJcbiAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHNhdmUpO1xyXG4gICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudE9yaWdpbiA9IGdldFBhcmVudE9yaWdpbigpO1xyXG5cclxuICAgICAgICAgICAgICBpZiAoZXZlbnQuZGF0YT8udHlwZSA9PT0gXCJyZWRpcmVjdC1ob21lXCIgJiYgcGFyZW50T3JpZ2luICYmIEFMTE9XRURfUEFSRU5UX09SSUdJTlMuaW5jbHVkZXMocGFyZW50T3JpZ2luKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2F2ZWQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihzYXZlZCAmJiBzYXZlZCAhPT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcGxhY2VIaXN0b3J5U3RhdGUoJy8nKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHJlc3RvcmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIGA7XHJcblxyXG4gICAgICByZXR1cm4gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHRhZzogJ3NjcmlwdCcsXHJcbiAgICAgICAgICBhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG4gICAgICAgICAgY2hpbGRyZW46IHNjcmlwdCxcclxuICAgICAgICAgIGluamVjdFRvOiAnaGVhZCdcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFuZGVyXFxcXHNvdXJjZVxcXFxyZXBvc1xcXFxmcm9udGVuZF9kb3hvbG9nb3NcXFxcZnVuY3Rpb25zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbmRlclxcXFxzb3VyY2VcXFxccmVwb3NcXFxcZnJvbnRlbmRfZG94b2xvZ29zXFxcXGZ1bmN0aW9uc1xcXFxsb2FkLWNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYW5kZXIvc291cmNlL3JlcG9zL2Zyb250ZW5kX2RveG9sb2dvcy9mdW5jdGlvbnMvbG9hZC1jb25maWcuanNcIjsvLyBTaW1wbGUgbG9hZGVyIHRvIHJlYWQgY29uZmlnL2xvY2FsLmVudiBmb3IgbG9jYWwgZGV2ZWxvcG1lbnRcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZExvY2FsRW52KCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByb290ID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCkpO1xyXG4gICAgY29uc3QgY2ZnUGF0aCA9IHBhdGguam9pbihyb290LCAnY29uZmlnJywgJ2xvY2FsLmVudicpO1xyXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGNmZ1BhdGgpKSByZXR1cm47XHJcbiAgICBjb25zdCBjb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhjZmdQYXRoLCAndXRmOCcpO1xyXG4gICAgY29udGVudHMuc3BsaXQoJ1xcbicpLmZvckVhY2gobGluZSA9PiB7XHJcbiAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IGlkeCA9IHRyaW1tZWQuaW5kZXhPZignPScpO1xyXG4gICAgICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuO1xyXG4gICAgICBjb25zdCBrZXkgPSB0cmltbWVkLnNsaWNlKDAsIGlkeCk7XHJcbiAgICAgIGNvbnN0IHZhbCA9IHRyaW1tZWQuc2xpY2UoaWR4ICsgMSk7XHJcbiAgICAgIGlmICghcHJvY2Vzcy5lbnZba2V5XSkgcHJvY2Vzcy5lbnZba2V5XSA9IHZhbDtcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIC8vIGlnbm9yZVxyXG4gIH1cclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdVLE9BQU9BLFdBQVU7QUFDelYsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsY0FBYyxvQkFBb0I7OztBQ0YyWSxPQUFPLFVBQVU7QUFDdmMsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxhQUFhO0FBQ3RCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sY0FBYztBQUNyQixZQUFZ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LFFBQVEsV0FBUztBQUFFLHdCQUFRLE1BQU0sU0FBUztBQUFBLGNBQUcsQ0FBQztBQUNyRCxrQkFBSSxHQUFHLE9BQU8sTUFBTTtBQUNuQixvQkFBSTtBQUNILHdCQUFNLE9BQU8sS0FBSyxNQUFNLElBQUk7QUFDNUIsMEJBQVEsSUFBSSx1Q0FBZ0MsSUFBSTtBQUdoRCxzQkFBSSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDekQsc0JBQUksSUFBSSxLQUFLLFVBQVU7QUFBQSxvQkFDdEIsU0FBUztBQUFBLG9CQUNULFlBQVksR0FBRyxRQUFRLElBQUksZ0JBQWdCLHVCQUF1QixrQ0FBa0MsS0FBSyxVQUFVO0FBQUEsb0JBQ25ILElBQUk7QUFBQSxzQkFDSCxJQUFJLHFCQUFxQixLQUFLLElBQUk7QUFBQSxzQkFDbEMsWUFBWSxHQUFHLFFBQVEsSUFBSSxnQkFBZ0IsdUJBQXVCLGtDQUFrQyxLQUFLLFVBQVU7QUFBQSxvQkFDcEg7QUFBQSxrQkFDRCxDQUFDLENBQUM7QUFBQSxnQkFDSCxTQUFTLEtBQUs7QUFDYixzQkFBSSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDekQsc0JBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxPQUFPLGlCQUFpQixTQUFTLElBQUksUUFBUSxDQUFDLENBQUM7QUFBQSxnQkFDekU7QUFBQSxjQUNELENBQUM7QUFBQSxZQUNGO0FBQUEsVUFDRCxDQUFDO0FBQUEsUUFDRjtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsWUFBWSxDQUFDLFFBQVEsT0FBTyxRQUFRLE9BQU8sT0FBUztBQUFBLElBQ3BELE9BQU87QUFBQSxNQUNOLEtBQUtDLE1BQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTixlQUFlO0FBQUEsTUFDZCxVQUFVO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAiX19kaXJuYW1lIiwgInBhdGgiLCAiZmlsZVVSTFRvUGF0aCIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsIiwgIl9fZmlsZW5hbWUiLCAiZmlsZVVSTFRvUGF0aCIsICJfX2Rpcm5hbWUiLCAiZnMiLCAicGF0aCIsICJwYXRoIiwgImZzIiwgInBhdGgiXQp9Cg==
