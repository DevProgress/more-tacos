/* jshint node:true */
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var vendorScripts = [
    'node_modules/js-marker-clusterer/src/markerclusterer.js',
    'node_modules/rlite-router/rlite.js'
];

var mainScripts = [
    'js/metrics.js',
    'js/app.js'
];

gulp.task('vendor', function() {
    return gulp.src(vendorScripts)
        .pipe(concat('vendor.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('scripts', function() {
    return gulp.src(mainScripts)
        .pipe(concat('main.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));  
});

gulp.task('watch', function() {
    gulp.watch('js/*.js', ['lint', 'scripts']);
});

gulp.task('lint', function() {
    return gulp.src('js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('build', ['lint', 'vendor', 'scripts']);
gulp.task('run', ['build', 'watch']);

gulp.task('default', ['build']);
