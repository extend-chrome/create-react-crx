#!/usr/bin/env node
/* eslint-disable no-unused-vars */
const prompts = require('prompts')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs-extra')
const path = require('path')
const sortPackageJson = require('sort-package-json')
const kebabCase = require('lodash.kebabcase')
const sanitize = require('sanitize-filename')

const repoUrls = {
  js: 'https://github.com/extend-chrome/js-react-boilerplate.git',
  ts: 'https://github.com/extend-chrome/ts-react-boilerplate.git',
}

const invalidName = `
A Chrome extension name cannot have more than 45 characters.
See: https://developer.chrome.com/docs/extensions/mv2/manifest/name/
`.trim()

const invalidVersion = `
A valid version has one to four dot-separated integers.
Examples: "1", "1.0", "2.0.3", "3.4.7.219"
See: https://developer.chrome.com/docs/extensions/mv2/manifest/version/
`.trim()

const invalidDescription = `
The description must be a no more than 132 characters.
See: https://developer.chrome.com/docs/extensions/mv2/manifest/description/
`.trim()

prompts([
  {
    type: 'text',
    name: 'name',
    message: 'Chrome extension package name:',
    validate: (n) => n.length < 32 || invalidName,
  },
  {
    type: 'text',
    name: 'version',
    message: 'First version number:',
    initial: '1.0.0',
    validate: (v) => !/[^.\d]/.test(v) || invalidVersion,
  },
  {
    type: 'text',
    name: 'author',
    message: 'Author name:',
  },
  {
    type: 'text',
    name: 'description',
    message: 'Description:',
    validate: (d) => d.length <= 132 || invalidDescription,
  },
  {
    type: 'select',
    name: 'lang',
    message: 'Which do you want to use?',
    choices: [
      { title: 'JavaScript', value: 'js' },
      { title: 'TypeScript', value: 'ts' },
    ],
    initial: 0,
  },
])
  .then(async ({ lang, author, description, name, version }) => {
    const packageName = kebabCase(sanitize(name, { replacement: '-' }))

    console.log(`Creating a Chrome extension in ./${packageName}`)

    await exec(`git clone ${repoUrls[lang]} ${packageName}`)

    const packageDir = path.join(process.cwd(), packageName)

    const packageJsonPath = path.join(packageDir, 'package.json')
    const { bugs, homepage, keywords, license, repository, ...packageJson } =
      await fs.readJSON(packageJsonPath)
    await fs.writeJSON(
      packageJsonPath,
      sortPackageJson({
        ...packageJson,
        author,
        description,
        name: packageName,
        version,
      }),
      { spaces: 2 },
    )

    const manifestJsonPath = path.join(packageDir, 'src', 'manifest.json')
    const manifestJson = await fs.readJSON(manifestJsonPath)
    await fs.writeJSON(
      manifestJsonPath,
      { ...manifestJson, name },
      { spaces: 2 },
    )

    const gitFolderPath = path.join(packageDir, '.git')
    await fs.remove(gitFolderPath)

    console.log(
      'Success: Now just `npm install` using your favorite package manager and create your Chrome extension!',
    )
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
