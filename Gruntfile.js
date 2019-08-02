// Generated on 2014-12-03 using generator-angular-fullstack 2.0.13
'use strict';

module.exports = function (grunt) {
  // Load grunt tasks automatically, when needed
  require('jit-grunt')(grunt, {
    useminPrepare: 'grunt-usemin',
    ngtemplates: 'grunt-angular-templates',
    protractor: 'grunt-protractor-runner',
    injector: 'grunt-injector',
  });

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    pkg: grunt.file.readJSON('package.json'),
    yeoman: {
      // configurable paths
      client: 'app',
      dist: 'dist/lforms-fhir-app',
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            'dist/*',
            '!<%= yeoman.dist %>/.git*',
            '!<%= yeoman.dist %>/.openshift',
            '!<%= yeoman.dist %>/Procfile'
          ]
        }]
      }
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/',
          src: '{,*/}*.css',
          dest: '.tmp/'
        }]
      }
    },

    // Debugging with node inspector
    'node-inspector': {
      custom: {
        options: {
          'web-host': 'localhost'
        }
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      target: {
        //src: '<%= yeoman.client %>/index.html'
        src: 'app/index.html'
        //ignorePath: '<%= yeoman.client %>/',
        //exclude: [/bootstrap-sass-official/, /bootstrap.js/, '/json3/', '/es5-shim/']
      }
    },

    uglify: {
      options: {
//        mangle: false,
//        compress: false
      }
    },

    // Renames files for browser caching purposes
    rev: {
      dist: {
        files: {
          src: [
            '<%= yeoman.dist %>/*.js',
            '<%= yeoman.dist %>/*.css'
          ]
        }
      }
    },

    shell: {
      insertVersionIntoPage: {
        command: 'v=`node -e \'console.log(require("./package.json").version)\'` && '+
          'sed -i s/VERSION_PLACEHOLDER/$v/ dist/lforms-fhir-app/*.app.js'
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: ['<%= yeoman.client %>/index.html',
             '<%= yeoman.client %>/launch.html'],
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              // no concat for css files. let cssmin do the concatenation,
              // where it can know the origin of the css files in order to do
              // the relative-path correction for referenced resources.
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    cssmin: {
      options: {
        relativeTo: '<%= yeoman.client %>/index.html',
        target: '<%= yeoman.client %>/.'
      }
    },

    // Performs rewrites based on rev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/*.html'],
      css: ['<%= yeoman.dist %>/*.css'],
      // js: ['<%= yeoman.dist %>/*.js'], -- we are not currently doing revved images
      options: { /*
        assetsDirs: [
          '<%= yeoman.dist %>/public',
          '<%= yeoman.dist %>/public/assets/images'
        ],
        // This is so we update image references in our ng-templates
        patterns: {
          js: [
            [/(assets\/images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the JS to reference our revved images']
          ]
        }
        */
      }
    },

    // Allow the use of non-minsafe AngularJS files. Automatically makes it
    // minsafe compatible so Uglify does not destroy the ng references
    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat',
          src: '*.js',
          dest: '.tmp/concat'
        }]
      }
    },

    // Package all the html partials into a single javascript payload
    ngtemplates: {
      options: {
        // This should be the name of your apps angular module
        module: 'lformsApp',
        htmlmin: {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true
        },
        usemin: 'app.js'
      },
      main: {
        cwd: '<%= yeoman.client %>',
        src: ['fhir-app/**/*.html'],
        dest: '.tmp/templates.js'
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      options: {
        mode: true,
      },
      dist: {
        files: [{
          expand: true,
          dot: true,
          timestamp: true,
          cwd: '<%= yeoman.client %>',
          dest: '<%= yeoman.dist %>',
          filter: function(src) {
            // Only font and image files are needed from the bower_components
            // directories -- except that we also need fhirpath.min.js.
            // Also, for jquery themes, only pick out the redmond theme.
            return src.match(/fhirpath.min.js/) || !src.match(/node_modules/) &&
             !src.match(/bower_components.*bower_components/) &&
             (!src.match(/bower_components/) ||
              src.match(/\.(eot|svg|ttf|woff|png|jpg|gif)/) &&
              (!src.match('jquery-ui/themes') || src.match('redmond')));
            // When bower components are linked from development versions,
            // filter out the linked components' bower_components,
            // node_modules, and .git directories
            //return !src.match(/bower_components.*(bower_components|node_modules|.git)/)
          },
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            'bower_components/**/**',
            'assets/images/{,*/}*.{jpg,gif}',
            'assets/fonts/**/*',
            'launch.html',
            'index.html',
            'ga.js'   // user supplied google analytics code
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          timestamp: true,
          dest: '<%= yeoman.dist %>/public/assets/images',
          src: ['generated/*']
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= yeoman.client %>',
        dest: '.tmp/',
        src: ['{app,components}/**/*.css']
      }
    },

    injector: {
      options: {

      },
      // Inject application script files into index.html (doesn't include bower)
      scripts: {
        options: {
          transform: function(filePath) {
            filePath = filePath.replace('/client/', '');
            filePath = filePath.replace('/.tmp/', '');
            return '<script src="' + filePath + '"></script>';
          },
          starttag: '<!-- injector:js -->',
          endtag: '<!-- endinjector -->'
        },
        files: {
          '<%= yeoman.client %>/index.html': [
              ['{.tmp,<%= yeoman.client %>}/{app,components}/**/*.js',
               '!{.tmp,<%= yeoman.client %>}/app/app.js',
               '!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.spec.js',
               '!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.mock.js']
            ]
        }
      },

      // Inject component css into index.html
      css: {
        options: {
          transform: function(filePath) {
            filePath = filePath.replace('/client/', '');
            filePath = filePath.replace('/.tmp/', '');
            return '<link rel="stylesheet" href="' + filePath + '">';
          },
          starttag: '<!-- injector:css -->',
          endtag: '<!-- endinjector -->'
        },
        files: {
          '<%= yeoman.client %>/index.html': [
            '<%= yeoman.client %>/{app,components}/**/*.css'
          ]
        }
      }
    }

  });


  grunt.registerTask('prune_modules', function() {
    grunt.log.ok('Prune the dev dependencies from dist');
    var exec = require('child_process').exec;
    var cb = this.async();
    exec('npm prune --production', {cwd: './dist'}, function(err, stdout, stderr) {
        grunt.log.ok(stdout);
        cb();
    });
  });

  grunt.registerTask('build', function(target) {
    grunt.task.run([
      'clean:dist',
      //'injector',
      'wiredep',
      'useminPrepare',
      'autoprefixer',
      'ngtemplates',
      'concat',
      'ngAnnotate',
      'copy:dist',
      'cssmin',
      'uglify',
      'rev',
      'usemin',
      'shell:insertVersionIntoPage'
//      'prune_modules'
    ]);
  });

  grunt.registerTask('default', [
    'build'
  ]);
};
