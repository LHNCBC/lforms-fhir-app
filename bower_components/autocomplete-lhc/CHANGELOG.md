# Change log

This log documents significant changes for each release.  This project follows
[Semantic Versioning](http://semver.org/).

## [16.1.0] - 2018-08-28
### Added
 - The search autocompleter now has an option "sort" which controls whether the
   list is sorted after being returned by the server.   Note that if you want
   the list to be exacatly as returned by the server, you should set the
   suggestionMode parameter to Def.Autocompleter.NO_COMPLETION_SUGGESTIONS so
   that a suggestion is not moved to the top of the list.

## [16.0.1] - 2018-07-02
### Fixed
 - Fixed an issue with selection of a list item that differs from another only by
   case, when the user types the item exactly and leaves the field without
   picking it.

## [16.0.0] - 2018-05-10
### Changed
- Various timeouts were adjusted from 1 ms to 0 ms, to introduce more
  predictability.
- [List selection events](http://lhncbc.github.io/autocomplete-lhc/docs.html#listSelection)
  are now sent for cases where matchListValue was set to true (requiring a list
  value) and an invalid value was entered.  In such cases, the autocompleter
  refocuses the field to the let user correct the error, and because the user
  was still working with the field, previously no event was sent.  However, it
  turned out that our AngularJS directive needed that event even for an invalid
  entry so it could update the data model.  On receiving such an event, you can
  check the value of "on_list" in the event's data object to determine whether the
  entry was valid or not.
- The above change means that we also now need to send a list selection event in
  the case where the field is cleared by the autocompleter after a second
  attempt to enter the same invalid value, even when the field started out
  blank.

## [15.1.1] - 2017-10-12
### Fixed
- Corrected an issue in which if a list that requires a matching value is left
  with a non-matching value by clicking in a second autocompleting field, the second
  field's list was left visible and active when the focus was returned the first
  first field.

## [15.1.0] - 2017-07-24
### Changed
- Revised the bower specification to make a file of helper functions available
  (basePage.js) that are useful for other applications when writing Protractor
  tests that interact with the autocompleter.

## [15.0.0] - 2017-07-07
### Added
- A new function, getSelectedItemData(), is now available for retrieving all
  information about the selected list items.
### Changed
- The expected data format for search autocompleters has changed slightly.  In
  particular, the optional fourth element of the the JSON data returned by the
  AJAX call is now an array of code system names declaring the code system for
  each of the codes in the codes array in position 1 of the JSON data.
  Previously, the optional fourth parameter was a boolean indicating that the
  display string data (position 3) might have span tags for formatting.
  However, it has been some time since the code used this parameter.  Span tags
  are still permitted in display strings, but it is no longer important that the
  autocompleter be aware of that.
- The parameter "tokens" has been renamed to "wordBoundaryChars", though for now
  the older parameter name will still work as well.

## [14.0.0] - 2017-05-25
### Changed
- The AngularJS directive for search lists now places the "extra data" fields
  for a selected list item in a sub-object of the data model object, under
  property name "data".  This breaking change is to avoid potential collisions
  between the field names of the extra data fields and the keys "text" and
  "code" which are set by the autocompleter.  If you are not using the AngularJS
  directive, this change will not affect you.

## [13.0.2] - 2017-05-25
### Fixed
- Missed checking in a file in 13.0.1 (causing a test to fail).

## [13.0.1] - 2017-05-24
### Fixed
- Fixed an accessibility issue with search lists by adding code to suggest on
  field focus that users start typing to see a list of matching results.

## [13.0.0] - 2017-05-10
### Fixed
- For AngularJS directive single-select lists, clearing a single-select list now
  results in the model being set to null (instead of {"text": ""}.)  This is
  essentially a bug-fix, but it is potentially a breaking change of long-standing
  behavior, so we've increased the major version number.  If you are not using
  the AngularJS directive, this change won't affect you.

## [12.0.1] - 2017-05-08
### Fixed
- For AngularJS directive lists, the new "_notOnList" model
  attribute no longer gets set when the list field is cleared.

## [12.0.0] - 2017-05-03
### Changed
- The AngularJS directive now includes an attribute "_notOnList" when
  constructing model objects from user entered values which did not match a list
  item.  This change won't affect you if you are not using the AngularJS
  directive.

## [11.0.3] - 2017-04-27
### Fixed
- Fixed a problem with AngularJS directive's handling of incorrect model
  assignments that have a null "text" attribute.

## [11.0.2] - 2017-04-20
### Fixed
- Several accessibility issues for screen reader users.
- Issues with the result counts for prefetch (non-AJAX) lists.
- The "return to field" link in the suggestion dialog.

## [11.0.1] - 2017-04-17
### Fixed
- For the angular directive, corrected the handling of a default value for
  prefetch lists.

## [11.0.0] - 2017-04-14
### Changed
- The search (AJAX) autocompleter now begins autocompleting with just one
  character in the field instead of two.  This behavior is configurable with the
  minChars option at construction.

## [10.2.1] - 2017-03-20
### Fixed
- The AngularJS directive now cleans up old formatters and parsers when the
  autocompleter is reinitialized.

## [10.2.0] - 2017-03-14
### Changed
- Replaced the search field "list" icon with a magnifying glass icon.

## [10.1.1] - 2017-02-01
### Fixed
- A minor issue in which lists created using the Angular directive would highlight an
  item configured as a default, even though that value was already present in
  the field.
- Lists created using the Angular directive now use the model objects provided
  by the caller rather than making a copy.

## [10.1.0] - 2017-01-13
### Added
- Support for autocompletion based on partial field values, separated by token
  characters.  To enable, set the "tokens" option (in the constructor's options
  hash) to an array of the desired token characters.

## [10.0.4] - 2017-01-06
### Fixed
- There was a problem with leading or trailing whitespace in search autocompletion fields
  preventing the display of the results list.

## [10.0.3] - 2016-12-23
### Changed
- The internal cache for search autocompleters is now entirely based on the URL
  instead of on the field ID.  This makes it easy to have two fields with the
  same URL share the on-page cache, and also avoids the need to clear the cache
  if a field's autocompleter or URL are changed.

## [10.0.2] - 2016-12-05
### Fixed
- The AngularJS directive for the case where prefetched lists have padded
  values.
- Lists created by the AngularJS directive were leaving list selection observers
  behind when they were destroyed and recreated.

## [10.0.1] - 2016-12-01
### Changed
- The directive now permits the search autocompleter to be constructed with an
  empty URL.  This is useful for cases in which the URL is not yet known.

## [10.0.0] - 2016-11-16
### Changed
- The "autocomp" parameter in URLs for search lists has been replaced with the
  "maxList" parameter, so that without either parameter specified the default
  return size is expected to be small.  When maxList is present, the URL is
  expected to return are large number of items (e.g., 500) if possible.  In
  other words, the expected effect of maxList is opposite that of autocomp.
- The default for the nonMatchSuggestions option is now false.

## [9.2.3] - 2016-11-14
### Fixed
- Added a needed polyfill for IE (Object.assign).  Versions 9.2.0-9.2.2 were
  broken for IE.

## [9.2.2] - 2016-10-28
### Fixed
- If the list is too wide for the page, the left edge of the list will be at the
  left edge of the page, rather than a negative position.

## [9.2.1] - 2016-10-27
### Fixed
- A problem was introduced in 9.2.0 that allowed the input field to be scrolled
  under a top navigation bar.

## [9.2.0] - 2016-10-26
### Added
- The ability for the left edge of the list to be positioned left of the field
  if needed to avoid the list extending past the right edge of the window.

## [9.1.2] - 2016-10-14
### Fixed
- A positioning problem which occured if the positioning process changed whether
  the scrollbar was showing.

## [9.1.1] - 2016-08-03
### Fixed
- Missing padding around column headers

## [9.1.0] - 2016-08-02
### Added
- The ability to specify column headers for search lists

### Changed
- The color scheme, as a part of selecting the color for the heading.

## [9.0.1] - 2016-06-08
### Fixed
- The field separator character is now removed from search strings before
  querying.  This solves a problem in which a selected list item could look
  invalid if a query was sent for the combined field value of a multi-field list.
- The AngularJS directive now clears a search field's result cache if its URL
  changes.

## [9.0.0] - 2016-06-07
### Fixed
- Removed the field's background image for print media.
### Changed
- Removed "!important" from the CSS.  It is this change that triggered the major
  version bump, since it is impossible to be sure whether this will mess up
  the CSS for someone using this package.

## [8.1.1] - 2016-05-20
### Changed
- Updated package tests to use Node.js 4 and changed the protractor tests to run
  Chrome, to work around an issue with Selenium webdriver or Firefox (see
  https://github.com/angular/protractor/issues/3200).

## [8.1.0] - 2016-04-07
### Added
- Search autocompleters now have a "setURL" method for updating the URL which
  also takes care of clearing the cached autocompletion results (from the
  previous URL), as well as a clearCachedResults method for clearing the cache
  (called by setURL).

