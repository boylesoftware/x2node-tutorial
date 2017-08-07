"use strict";

const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const hljs = require('highlight.js');

const plugins = gulpLoadPlugins();

gulp.task('img', () => gulp.src('src/img/**/*')
	.pipe(gulp.dest('dist/img'))
);

gulp.task('css', () => gulp.src('src/stylesheet.scss')
	.pipe(plugins.sass())
	.pipe(plugins.addSrc('node_modules/highlight.js/styles/agate.css'))
	.pipe(plugins.concat('stylesheet.min.css'))
	.pipe(plugins.cleanCss())
	.pipe(gulp.dest('dist/css'))
);

gulp.task('markdown', () => gulp.src('src/TUTORIAL.md')
	.pipe(plugins.marked({
		highlight: (code, lang) => (lang ? hljs.highlight(lang, code).value : code)
	}))
	.pipe(plugins.wrap({
		src: 'src/template.html'
	}))
	.pipe(plugins.rename('index.html'))
	.pipe(gulp.dest('dist'))
);

gulp.task('build', [ 'markdown', 'css', 'img' ]);

gulp.task('default', [ 'build' ]);

gulp.task('watch', [ 'build' ], () => {

	console.log('watching for source changes...');

	function watch(path, tasks) {
		gulp.watch(path, tasks).on('change', event => {
			console.log(`${event.path.substring(__dirname.length)} was ${event.type}, rebuilding...`);
		});
	}

	watch([ 'src/TUTORIAL.md', 'src/template.html' ], [ 'markdown' ]);
	watch('src/stylesheet.scss', [ 'css' ]);
	watch('src/img/**/*', [ 'img' ]);
});
