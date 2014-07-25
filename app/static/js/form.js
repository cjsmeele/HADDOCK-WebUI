"use strict";

$(function(){
	var formHasChanged   = false;
	var formLevelTooHigh = false;
	var components = formComponents;

	function getComponentCount(){
	}

	function buildForm(components){
	}

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
			// Of course, we filter submitted fields based on access level on the server side as well.
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

		var rowsToHide = $('#haddockform .row:not([class~="level-' + name + '"]');
		var rowsToShow = $('#haddockform .row.level-' + name);

		if(Config.hideDisabledComponents){
			rowsToHide.hide();
			rowsToShow.show();
		}

		// FIXME: Select elements are not disabled
		//        (Though this is not really a problem, as they _are_ hidden
		//        and we do server-side checks as well)
		rowsToHide.find('> .value input').prop('disabled', true);
		rowsToShow.find('> .value input').prop('disabled', false);

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
			$('.levelwarning').slideDown(80);
			$('#haddockform input[type="submit"]').prop('disabled', true);
		}else{
			formLevelTooHigh = false;

			$('.levelwarning').slideUp(80);
			$('#haddockform input[type="submit"]').prop('disabled', false);
		}
	}

	function toggleSection(section, batch){
		var toggleButton = $(section).find('header > .togglebutton')[0];

		if($(section).hasClass('folded')){
			$(toggleButton).removeClass('fa-angle-double-up');
			$(toggleButton).addClass('fa-angle-double-down');
			$(section).removeClass('folded');
			if(batch === true)
				$($(section).find('.content')[0]).show();
			else
				$($(section).find('.content')[0]).slideDown(80);
		}else{
			$(toggleButton).removeClass('fa-angle-double-down');
			$(toggleButton).addClass('fa-angle-double-up');
			$(section).addClass('folded');
			if(batch === true)
				$($(section).find('.content')[0]).hide();
			else
				$($(section).find('.content')[0]).slideUp(80);
		}
	}

	$('.levelchooser li').click(function(e){
		setLevel($(this).data('name'));
	});

	//$('#haddockform section > header .header-text').click(function(e){
	$('#haddockform section > header').click(function(e){
		toggleSection($(this).parents('section')[0]);
	});

	$('#haddockform .parameter:not([type="file"])').change(function(e){
		formHasChanged = true;

		if($(this).is('input') || $(this).is('select')){
			var buttonSet = $('.buttonset[data-for="'+ $(this).attr('id') +'"]');
			if($(this).val() == $(this).data('default')){
				buttonSet.find('.reset').addClass('invisible');
			}else{
				buttonSet.find('.reset').removeClass('invisible');
			}
		}else if($(this).is('.buttongroup')){
			//buttonSet.find('.reset').removeClass('invisible');
		}
	});

	$('#haddockform input[type="text"]').focus(function(e){
		// Automatically select input element contents on focus
		$(this).one('mouseup', function(){
			$(this).select();
			return false;
		})
		$(this).select();
	});

	$('.buttonset i.reset').click(function(e){
		var buttonSet = $(this).parent('.buttonset');
		var input = $('#'+buttonSet.data('for'));

		if(input.is('input[type="text"]')){
			input.val(input.data('default'));
		}else if(input.is('select')){
			input.val(input.data('default'));
		}else if(input.is('.checkgroup')){
			// Now let's just hope the default value doesn't contain double quotes...
			input.find('input[type="radio"][value="' + input.data('default') + '"]').prop('checked', true);
		}

		$(this).addClass('invisible');

		e.preventDefault();
		e.stopPropagation();
	});

	$('.buttonset i.plus').click(function(e){
		// TODO

		// Stop click events from reaching the header and folding this section
		e.preventDefault();
		e.stopPropagation();
	});

	$('.buttonset i.minus').click(function(e){
		// TODO

		e.preventDefault();
		e.stopPropagation();
	});

	window.setTimeout(function(){
		// Fold all sections
		$('#haddockform section').each(function(){ toggleSection(this, true); });
		setLevel(formLevel, true);
		$('.loading').hide();
		$('#haddockform').removeClass('hidden');
	}, 100);

	buildForm(formComponents);
});
