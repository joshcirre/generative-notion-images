<?php

// Laravel Cloud only deploys PHP applications: it serves this directory as the
// document root and boots PHP, with no notion of a Node process or a static
// site. This app is a static Vite bundle, so the built assets sit alongside
// this file and anything that isn't one of them falls through to here and gets
// the SPA shell.

$shell = __DIR__.'/index.html';

if (! is_file($shell)) {
    http_response_code(500);
    exit("Build missing — `npm run build` did not produce index.html.\n");
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

readfile($shell);
