/* jshint node:true */
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var cleancss = require('gulp-clean-css');
var del = require('del');

var vendorScripts = [
    'node_modules/js-marker-clusterer/src/markerclusterer.js',
    'node_modules/rlite-router/rlite.js'
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

gulp.task('copy:vendor', function() {
    return gulp.src(vendorScripts)
        .pipe(gulp.dest('dist/js'));
});

gulp.task('copy:scripts', function() {
    return gulp.src('js/**')
        .pipe(gulp.dest('dist/js'));
});

gulp.task('minify:images', function() {
    return gulp.src('images/*')
        .pipe(imagemin())
        .pipe(gulp.dest('dist/images'));
});

gulp.task('copy:css', function() {
    return gulp.src('css/*')
        .pipe(cleancss({compatibility: 'ie8'}))
        .pipe(gulp.dest('dist/css'));
});

gulp.task('watch', function() {
    gulp.watch('js/*.js', ['lint', 'scripts']);
});

gulp.task('lint', function() {
    return gulp.src('js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('build:production', ['clean', 'lint', 'minfy:vendor', 'minify:scripts',
          'minify:images', 'copy:css']);
gulp.task('build:development', ['clean', 'lint', 'copy:vendor', 'copy:scripts',
          'minify:images', 'copy:css']);

gulp.task('run', ['build:development', 'watch']);

gulp.task('default', ['run']);
