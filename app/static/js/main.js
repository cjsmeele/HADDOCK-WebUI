"use strict";

var User = {
	browser:        null,
	browserVersion: null
};

$(function(){

	function getIEVersion(){
		if(window.navigator.appName === 'Microsoft Internet Explorer'){
			var re = /MSIE ([0-9]{1,})/;
			if (re.exec(window.navigator.userAgent) !== null)
				return parseInt(RegExp.$1);
		}
		return null;
	}

	var ieVersion = getIEVersion();
	if(ieVersion === null){
		User.browser = 'notIE';
	}else{
		User.browser        = 'IE';
		User.browserVersion = ieVersion;
	}
});
