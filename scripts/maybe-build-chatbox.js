'use strict';

// Only bake chatbox on Vercel. Local `npm install` stays fast.
// Needed because legacy vercel.json `builds` ignores installCommand/buildCommand.
if (!process.env.VERCEL) {
  process.exit(0);
}

require('./build-chatbox.js');
