var superagent = require('superagent');
var cheerio = require('cheerio');
var async = require('async');
var json2xls = require('json2xls');
var moment = require('moment');
var fs = require('fs');
var _ = require('underscore');

var MAX = 10;
var MIN_RATE = 7.9;
var PAGE_SIZE = 50;
var result = [];

console.log('Start>>>>>>>>>>>Now!');
fetchPage();

function fetchPage(page) {
    page = page || 0;
    console.log('Get Page ' + page);
    superagent.get('https://movie.douban.com/j/search_subjects').query({
            type: 'movie',
            tag: '热门',
            sort: 'recommend',
            'page_limit': PAGE_SIZE,
            'page_start': page * PAGE_SIZE
        }).set('Referer', 'https://movie.douban.com/explore')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36')
        .set('Cookie', 'bid="pTU06zZ8QyY"; ll="108296"; ap=1; _vwo_uuid_v2=5CC6A6AE9BD268C0B2E9B5E4C374EB43|a2200e08b7e846503db56ea634643c3c; viewed="25768396"; gr_user_id=8e50ee9c-5b21-4e52-8950-96ceff9a53d6; __utmt=1; _pk_id.100001.4cf6=9be8c9b9e86735c3.1470191480.7.1470820611.1470816697.; _pk_ses.100001.4cf6=*; __utma=30149280.2081495851.1444747226.1470816697.1470818655.28; __utmb=30149280.3.10.1470818655; __utmc=30149280; __utmz=30149280.1469786953.21.20.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; __utma=223695111.1815675230.1470191491.1470816697.1470818655.7; __utmb=223695111.0.10.1470818655; __utmc=223695111; __utmz=223695111.1470191491.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)')
        .end(function(err, res) {
            var content = JSON.parse(res.text);
            console.log('========================================');
            console.log(content);
            console.log('========================================');
            async.filterLimit(content.subjects, 1, function(item, callback) {
                var rate = parseFloat(item.rate);
                if (rate >= MIN_RATE) {
                    fetchDetail(item, callback);
                    item.rate = rate;
                    result.push(item);
                } else {
                    callback(null, false);
                }
            }, function(err, rlt) {
                console.log('========================================');
                console.log(rlt);
                console.log('========================================');
                if (result.length >= MAX) {
                    console.log('Complete>>>>>>>>>>>Cheers!');
                    result = _.sortBy(result, 'rate');
                    console.log(result);
                    result = _.map(result, function(item) {
                        return _.pick(item, 'rate', 'title', 'year', 'type', 'url', 'desc');
                    })
                    var now = moment().format('YYYYMMDD-HHmm');
                    fs.writeFileSync('movie_' + now + '.xlsx', json2xls(result), 'binary');
                } else {
                    setTimeout(function() {
                        fetchPage(page + 1);
                    }, 1000);
                }
            })
        })
}

function fetchDetail(item, callback) {
    console.log('fetch detail >>> ' + item.url);
    superagent.get(item.url).set('Referer', 'https://movie.douban.com/explore')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36')
        .set('Cookie', 'bid="pTU06zZ8QyY"; ll="108296"; ap=1; _vwo_uuid_v2=5CC6A6AE9BD268C0B2E9B5E4C374EB43|a2200e08b7e846503db56ea634643c3c; viewed="25768396"; gr_user_id=8e50ee9c-5b21-4e52-8950-96ceff9a53d6; __utmt=1; _pk_id.100001.4cf6=9be8c9b9e86735c3.1470191480.7.1470820611.1470816697.; _pk_ses.100001.4cf6=*; __utma=30149280.2081495851.1444747226.1470816697.1470818655.28; __utmb=30149280.3.10.1470818655; __utmc=30149280; __utmz=30149280.1469786953.21.20.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; __utma=223695111.1815675230.1470191491.1470816697.1470818655.7; __utmb=223695111.0.10.1470818655; __utmc=223695111; __utmz=223695111.1470191491.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)')
        .end(function(err, res) {
            var $ = cheerio.load(res.text);
            item.year = $('h1 span.year').text().trim();
            item.type = $('span[property="v:genre"]').text();
            item.desc = $('#link-report span.all').text().trim();
            if (_.isEmpty(item.desc)) {
                item.desc = $('span[property="v:summary"]').text().trim();
            }
            console.log(item.url + ' >>> DONE');
            callback(null, true);
        })
}
