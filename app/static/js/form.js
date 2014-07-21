"use strict";

$(function(){
	function setLevel(name){
		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevel = formLevels.indexOf(name);

		for(var i=0; i<formLevels.length; i++){
			if(i <= formLevel){
				$('#haddockform .level-'+formLevels[i]).removeClass('disabled');
				$('#haddockform .level-'+formLevels[i]+' input').prop('disabled', false);

				if(Config.hideDisabledComponents)
					$('#haddockform .level-'+formLevels[i]).slideDown(120);
			}else{
				$('#haddockform .level-'+formLevels[i]).addClass('disabled');
				$('#haddockform .level-'+formLevels[i]+' input').prop('disabled', true);

				if(Config.hideDisabledComponents)
					$('#haddockform .level-'+formLevels[i]).slideUp(120);
			}
		}

		if(formLevel > userLevel){
			$('.levelwarning').html(
				'<p>'
				+ ' <i class="fa fa-warning"></i>'
				+ ' Warning: Because your current access level is not high enough for the ' + name + ' interface,'
				+ ' you will be unable to submit this form.'
				+ ' Please <a href="mailto:/dev/null">request a higher access level</a> or use a different form level.'
				+ '</p>'
			);
			$('.levelwarning').slideDown(120);
			$('#haddockform input[type="submit"]').prop('disabled', true);
		}else{
			$('.levelwarning').slideUp(120);
			$('#haddockform input[type="submit"]').prop('disabled', false);
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
	});

	$('#haddockform section > header').click(function(e){
		toggleSection($(this).parent('section')[0]);
	});

	setLevel(formLevel);
});
