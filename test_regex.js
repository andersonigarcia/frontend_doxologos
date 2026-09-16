const dashboardUrl = '<iframe width="100%" height="400" frameborder="0" allowfullscreen src="https://us.posthog.com/embedded/kljWwA4Tlfi2ptLFuERUp3zxz2AfaQ" key="1" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>';

let finalUrl = dashboardUrl.trim();
const srcMatch = finalUrl.match(/src=["'](.*?)["']/);
if (srcMatch && srcMatch[1]) {
    finalUrl = srcMatch[1];
}

console.log("FINAL URL:", finalUrl);
