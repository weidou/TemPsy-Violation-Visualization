// https://codeforgeek.com/2014/12/highlight-search-result-angular-filter/
angular.module('violationreporting').filter('highlightProperty', function($sce) {
  return function(text, phrases) {
    if(phrases) {
      var text;
      if(angular.isArray(phrases)) {
        var phraseRegexStr = '(';
        _.each(phrases, function(word) {
          phraseRegexStr = phraseRegexStr + '(\\b' + word + '\\b)|';
        });
        phraseRegexStr = phraseRegexStr.slice(0, -1) + ')';
        phrases = phraseRegexStr;
      }
      text = text.replace(new RegExp('(\\b' + phrases + '\\b)', 'gi'),
        '<span class="highlighted">$1</span>');
    }
    return $sce.trustAsHtml(text);
  };
});
