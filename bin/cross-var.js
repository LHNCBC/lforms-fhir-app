// This file is based on the cross-var package https://www.npmjs.com/package/cross-var.
// The license is included in the same directory.

const {spawn} = require('cross-spawn');

/**
 * Replaces nodejs environment variable names in the input strings with actual values,
 * regardless of its Linux or Windows format.
 * For example, both '$npm_package_name' and '%npm_package_name%' will be replaced
 * with 'lforms-fhir-app'.
 * @param args
 * @returns {*}
 */
function normalize(args) {
  return args.map(arg => {
    Object.keys(process.env)
      .sort((x, y) => x.length < y.length) // sort by descending length to prevent partial replacement
      .forEach(key => {
        const regex = new RegExp(`\\$${ key }|%${ key }%`, "ig");
        arg = arg.replace(regex, process.env[key]);
      });
    return arg;
  })
}

let args = process.argv.slice(2);
args = normalize(args);
const command = args.shift();
spawn.sync(command, args, {stdio: "inherit"});
