"use strict";

$(function(){
	var formHasChanged   = false;
	var formLevelTooHigh = false;

	function setLevel(name, force){
		if(
				$('.levelchooser li.selected')[0] === $('.levelchooser li.level-'+name)[0]
				&& force !== true
			){
			// We are already at the right level
			return;
		}

		if(!formLevelTooHigh && formLevels.indexOf(name) < formLevelIndex && formHasChanged){
			// Because lower form levels hide certain fields, the user may lose
			// filled in data by switching to a lower form level.
			// Although we do not reset input fields, we should warn the user
			// that some parameters may not be saved.
			// Of course, we filter submitted fields based on access level on the server side as well
			if(!confirm(
					'You may lose filled in parameters by switching to a lower form level.'
					+ "\nAre you sure you want to switch to the " + name + ' form?'
				)){
				return;
			}
		}

		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevelIndex = formLevels.indexOf(name);

		for(var i=0; i<formLevels.length; i++){
			if(i <= formLevelIndex){
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

		if(formLevelIndex > userLevel){
			formLevelTooHigh = true;

			$('.levelwarning').html(
				'<p>'
				+ ' <i class="fa fa-warning"></i>'
				+ ' Warning: Because your current access level is not high enough for the ' + name + ' interface,'
				+ ' you will be unable to submit this form.'
				+ ' Please <a href="mailto:/dev/null">request a higher access level</a> or choose a different form level above.'
				+ '</p>'
			);
			$('.levelwarning').slideDown(120);
			$('#haddockform input[type="submit"]').prop('disabled', true);
		}else{
			formLevelTooHigh = false;

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

	$('#haddockform .parameter').change(function(e){
		formHasChanged = true;
	});

	$('#haddockform input[type="text"]').focus(function(e){
		$(this).one('mouseup', function(){
			$(this).select();
			return false;
		})
		$(this).select();
	});

	setLevel(formLevel, true);
});
