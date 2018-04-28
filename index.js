

var project3 = angular.module('project3',[]);

project3.controller('ctrl', function ($scope,$http) {

    $scope.rows = [];

    $scope.submit = function (searchBox,select) {

        if(searchBox === undefined){
            alert("Please Enter A Title or Person.");
        }
        else if(select === undefined){
            alert("Please Select A Category.")
        }
        else {
            $scope.inputValue = searchBox;
            $scope.dropDownValue = select;

            var url = "/results?search=" + $scope.inputValue + "&dropDown="+$scope.dropDownValue;
            $http({
                method: 'POST',
                url: url
            }).then(function successCallback(response) {
                $scope.rows = [];
                //TODO: change the post request to grab the DB queries... (Instead of grabbing the html document)
                console.log("success");
                console.log(response);
                if(response.data.length === 0){
                    alert('Sorry, No Data Was Found.');
                } else {

                    for(i=0; i < response.data.length; i ++){
                        $scope.rows[i] = response.data[i];
                    }
                }

            }, function errorCallback(response) {
                //TODO: if there is an error, possibly change to an error page.
                console.log('fail');
                console.log(response);
            });

        }//error checking

    }//Submit


});