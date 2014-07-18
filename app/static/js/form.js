"use strict";

$(function(){
	function setLevel(name){
		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevel = formLevels.indexOf(name);

		for(var i=0; i<formLevels.length; i++){
			if(i <= formLevel){
				$('form .level-'+formLevels[i]).removeClass('disabled');
				$('form .level-'+formLevels[i]+" input").prop('disabled', false);

				if(Config.hideDisabledComponents)
					$('form .level-'+formLevels[i]).slideDown(120);
			}else{
				$('form .level-'+formLevels[i]).addClass('disabled');
				$('form .level-'+formLevels[i]+" input").prop('disabled', true);

				if(Config.hideDisabledComponents)
					$('form .level-'+formLevels[i]).slideUp(120);
			}
		}
	}

	function toggleSection(section){
		var toggleButton = $(section).find('header > .togglebutton')[0];

		if($(section).hasClass('folded')){
			$(toggleButton).removeClass('fa-angle-double-up');
			$(toggleButton).addClass('fa-angle-double-down');
			$(section).removeClass('folded');
			$($(section).find('.content')[0]).slideDown(120);
		}else{
			$(toggleButton).removeClass('fa-angle-double-down');
			$(toggleButton).addClass('fa-angle-double-up');
			$(section).addClass('folded');
			$($(section).find('.content')[0]).slideUp(120);
		}
	}

	$('.levelchooser li').click(function(e){
		setLevel($(this).data('name'));
		e.preventDefault();
	});

	$('form section > header').click(function(e){
		toggleSection($(this).parent('section')[0]);
	});

	setLevel(formLevel);
});
