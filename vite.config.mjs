import resolve from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import autoprefixer from 'autoprefixer';             // Adds vendor specific extensions to CSS
import postcssPresetEnv from 'postcss-preset-env';       // Popular postcss plugin for next gen CSS usage.
import cssnano from 'cssnano';
// ATTENTION!
// Please modify the below variables: s_PACKAGE_ID and s_SVELTE_HASH_ID appropriately.

// For convenience, you just need to modify the package ID below as it is used to fill in default proxy settings for
// the dev server.
const s_PACKAGE_ID = 'systems/loghorizontrpg';

// A short additional string to add to Svelte CSS hash values to make yours unique. This reduces the amount of
// duplicated framework CSS overlap between many TRL packages enabled on Foundry VTT at the same time. 'tse' is chosen
// by shortening 'template-svelte-esm'.
const s_SVELTE_HASH_ID = 'lhtrpg';


// Used in bundling particularly during development. If you npm-link packages to your project add them here.
const s_RESOLVE_CONFIG = {
    browser: true
};
export default ({command, mode}) => {
    /** @type {import('vite').UserConfig} */
    const s_COMPRESS = false;  // Set to true to compress the module bundle.
    const s_SOURCEMAPS = mode === "development"; // Generate sourcemaps for the bundle (recommended).
    const plugins = s_COMPRESS ? [autoprefixer, postcssPresetEnv, cssnano] : [autoprefixer, postcssPresetEnv];
    return {
        root: 'src/',                 // Source location / esbuild root.
        base: `/${s_PACKAGE_ID}/`,    // Base module path that 30001 / served dev directory.
        publicDir: false,             // No public resources to copy.
        cacheDir: '../.vite-cache',   // Relative from root directory.

        resolve: { conditions: ['import', 'browser'] },

        esbuild: {
            target: ['es2022']
        },

        css: {
            // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
            postcss: {
                inject: false,                                        // Don't inject CSS into <HEAD>
                s_SOURCEMAPS,
                extensions: ['.scss', '.sass', '.css'],               // File extensions
                plugins: plugins,                                              // Postcss plugins to use
                use: ['sass']                                         // Use sass / dart-sass
            }
        },

        // About server options:
        // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
        // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
        //
        // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
        // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
        // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
        // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
        // static resources / project.
        server: {
            port: 30001,
            open: '/game',
            proxy: {
                // Serves static files from main Foundry server.
                [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]: 'http://localhost:30000',

                // All other paths besides package ID path are served from main Foundry server.
                [`^(?!/${s_PACKAGE_ID}/)`]: 'http://localhost:30000',

                // Enable socket.io from main Foundry server.
                '/socket.io': { target: 'ws://localhost:30000', ws: true }
            }
        },

        build: {
            outDir: "../",
            emptyOutDir: false,
            sourcemap: s_SOURCEMAPS,
            brotliSize: true,
            minify: s_COMPRESS ? 'terser' : false,
            target: ['es2022'],
            terserOptions: s_COMPRESS ? {
                compress: {
                    passes: 3
                },
                mangle: {
                    toplevel: true,
                    keep_classnames: true,
                    keep_fnames: true
                },
                module: true, 
                ecma: 2022
            } : void 0,
            lib: {
                entry: './loghorizontrpg.mjs',
                formats: ['es'],
                fileName: 'loghorizontrpg'
            }
        },

        // Necessary when using the dev server for top-level await usage inside TRL.
        optimizeDeps: {
            esbuildOptions: {
                target: 'es2022'
            }
        },

        plugins: [
            resolve(s_RESOLVE_CONFIG)  // Necessary when bundling npm-linked packages.
        ]
    };
};