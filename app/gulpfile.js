/* jshint node:true */
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var cleancss = require('gulp-clean-css');
var htmlmin = require('gulp-htmlmin');
var del = require('del');
var connect = require('gulp-connect');
var runSequence = require('run-sequence');

var vendorScripts = [
    'node_modules/js-marker-clusterer/src/markerclusterer.js',
    'node_modules/rlite-router/rlite.js',
    'node_modules/node-polyglot/build/polyglot.js'
];

gulp.task('clean', function() {
    return del.sync(['dist/**'], {force: true});
});

gulp.task('minify:vendor', function() {
    return gulp.src(vendorScripts)
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('minify:scripts', function() {
    return gulp.src('js/**')
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('minify:html', function() {
    return gulp.src('**/**.html')
        .pipe(htmlmin())
        .pipe(gulp.dest('dist'));
});

gulp.task('minify:images', function() {
    return gulp.src('images/*')
        .pipe(imagemin())
        .pipe(gulp.dest('dist/images'));
});

gulp.task('copy:html', function() {
    return gulp.src('**/**.html')
        .pipe(gulp.dest('dist'));
});

gulp.task('copy:vendor', function() {
    return gulp.src(vendorScripts)
        .pipe(gulp.dest('dist/js'));
});

gulp.task('copy:scripts', function() {
    return gulp.src('js/**')
        .pipe(gulp.dest('dist/js'));
});

gulp.task('copy:translations', function() {
    return gulp.src('js/i8ln/*.json')
        .pipe(gulp.dest('dist/js/i8ln'));
});

gulp.task('copy:css', function() {
    return gulp.src('css/*')
        .pipe(cleancss({compatibility: 'ie8'}))
        .pipe(gulp.dest('dist/css'));
});

gulp.task('connect', function() {
    return connect.server({
        root: ['dist'],
        port: 4000,
        livereload: true
    });
});

gulp.task('watch', ['connect'], function () {
    gulp.watch('js/**/*.js', ['lint', 'copy:scripts']);
    gulp.watch('js/i18n/**.json', ['copy:translations']);
    gulp.watch('css/**/*.css', ['copy:scripts']);
    gulp.watch('images/*.png', ['minify:images']);
    gulp.watch(vendorScripts, ['copy:vendor']);
    gulp.watch('**.html', ['copy:html']);
});

gulp.task('lint', function() {
    return gulp.src('js/**.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('build:production', ['clean', 'lint', 'minfy:vendor', 'minify:scripts', 'minify:html',
          'minify:images', 'copy:css', 'copy:translations']);
gulp.task('build:development', ['clean', 'lint', 'copy:vendor', 'copy:scripts', 'copy:html',
          'minify:images', 'copy:css', 'copy:translations']);

gulp.task('run', function(cb) {
    runSequence('build:development', 'watch', cb);
});

gulp.task('default', ['run']);
