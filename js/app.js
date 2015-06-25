var vid;
var overlay;
var overlayCC;
var videoSelector;
var ctrack;
var ec;
var emotionData;
var margin;
var barWidth;
var formatPercent;
var x;
var y;
var svg;
var imgData;
var greenArray = [];
var xVal;
var yVal;
var updateInterval;
var dataLength;
var dps;
var chart;
var dpsFFT, chartFFT;
var data;

function init() {
    initChart();
    fftCount();
    vid = document.getElementById('videoel');
    overlay = document.getElementById('overlay');
    overlayCC = overlay.getContext('2d');

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

    // check for camerasupport
    if (navigator.getUserMedia) {
        // set up stream

        videoSelector = {
            video: true
        };
        if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
            var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
            if (chromeVersion < 20) {
                videoSelector = "video";
            }
        };

        navigator.getUserMedia(videoSelector, function(stream) {
            if (vid.mozCaptureStream) {
                vid.mozSrcObject = stream;
            } else {
                vid.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
            }
            vid.play();
        }, function() {
            //insertAltVideo(vid);
            alert("There was some problem trying to fetch video from your webcam. If you have a webcam, please make sure to accept when the browser asks for access to your webcam.");
        });
    } else {
        //insertAltVideo(vid);
        alert("This demo depends on getUserMedia, which your browser does not seem to support. :(");
    }

    vid.addEventListener('canplay', enablestart, false);


    ctrack = new clm.tracker({
        useWebGL: true
    });
    ctrack.init(pModel);
    ec = new emotionClassifier();
    ec.init(emotionModel);
    emotionData = ec.getBlank();
    /************ d3 code for barchart *****************/

    margin = {
            top: 20,
            right: 20,
            bottom: 10,
            left: 40
        },
        width = 400 - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    barWidth = 30;

    formatPercent = d3.format(".0%");

    x = d3.scale.linear()
        .domain([0, ec.getEmotions().length]).range([margin.left, width + margin.left]);

    y = d3.scale.linear()
        .domain([0, 1]).range([0, height]);

    svg = d3.select("#emotion_chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

    svg.selectAll("rect").
    data(emotionData).
    enter().
    append("svg:rect").
    attr("x", function(datum, index) {
        return x(index);
    }).
    attr("y", function(datum) {
        return height - y(datum.value);
    }).
    attr("height", function(datum) {
        return y(datum.value);
    }).
    attr("width", barWidth).
    attr("fill", "#2d578b");

    svg.selectAll("text.labels").
    data(emotionData).
    enter().
    append("svg:text").
    attr("x", function(datum, index) {
        return x(index) + barWidth;
    }).
    attr("y", function(datum) {
        return height - y(datum.value);
    }).
    attr("dx", -barWidth / 2).
    attr("dy", "1.2em").
    attr("text-anchor", "middle").
    text(function(datum) {
        return datum.value;
    }).
    attr("fill", "white").
    attr("class", "labels");

    svg.selectAll("text.yAxis").
    data(emotionData).
    enter().append("svg:text").
    attr("x", function(datum, index) {
        return x(index) + barWidth;
    }).
    attr("y", height).
    attr("dx", -barWidth / 2).
    attr("text-anchor", "middle").
    attr("style", "font-size: 12").
    text(function(datum) {
        return datum.emotion;
    }).
    attr("transform", "translate(0, 18)").
    attr("class", "yAxis");



    /******** stats ********/

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.getElementById('container').appendChild(stats.domElement);

    // update stats on every iteration
    document.addEventListener('clmtrackrIteration', function(event) {
        stats.update();
    }, false);


}


/********** check and set up video/webcam **********/

function enablestart() {
    var startbutton = document.getElementById('startbutton');
    startbutton.value = "start";
    startbutton.disabled = null;
}

/*var insertAltVideo = function(video) {
if (supports_video()) {
if (supports_ogg_theora_video()) {
  video.src = "../media/cap12_edit.ogv";
} else if (supports_h264_baseline_video()) {
  video.src = "../media/cap12_edit.mp4";
} else {
  return false;
}
//video.play();
return true;
} else return false;
}*/


/*********** setup of emotion detection *************/



function startVideo() {
    // start video
    vid.play();
    // start tracking
    ctrack.start(vid);
    seconds = new Date().getTime() / 1000;
    // start loop to draw face
    drawLoop();
}
var cp;
var er;
var ii = 0;
var seconds;
var periods = 0;

function drawLoop() {
    requestAnimFrame(drawLoop);
    overlayCC.clearRect(0, 0, 400, 300);
    if (ctrack.getCurrentPosition()) {
        ctrack.draw(overlay);
        overlayCC.fillStyle = "#FF0000";
        //18-end of left brow. 22-right brow
        var draXL = ctrack.getCurrentPosition()[18][0];
        var draYL = ctrack.getCurrentPosition()[18][1];
        var draXR = ctrack.getCurrentPosition()[22][0];
        var draYR = ctrack.getCurrentPosition()[22][1];
        //console.log(draXR-draXL);
        overlayCC.fillRect(draXL, draYL - 20, draXR - draXL, 20);

        imgData = overlayCC.getImageData(draXL, draYL - 20, draXR - draXL, 20);

        var size = (draXL - draXR + 1) * 21;
        // console.log("size=" + size);
        var index = 1;
        var green = 0;
        for (var i = 0; i < size; i++) {
            green = green + imgData.data[index];
            index = index + 3;
            //console.log("i="+i);
            //console.log("index="+index);
            //console.log("green="+green);
        };


        ii++;
        param = (green / size) - 120;

        // param = 100*Math.sin(Math.PI*ii/17);
        // if (Math.abs(param)<0.00000001) periods++;
        // console.log(ii+" "+periods+" "+(new Date().getTime() / 1000-seconds)+" "+(30*periods/(new Date().getTime() / 1000-seconds)));
        greenArray.push(param);
        updateChart(param);
        fftCount();

        //overlayCC.fillRect(draX,draY,5,5);
        //overlayCC.fillRect(draX,draY,5,5);
        //overlayCC.fillStyle = 'BLUE';
        overlayCC.beginPath();
        overlayCC.moveTo(draXL, draYL);
        overlayCC.lineTo(draXR, draYR);
        overlayCC.lineTo(draXR, draYR - 20);
        overlayCC.lineTo(draXL, draYL - 20);
        overlayCC.closePath();
        overlayCC.fill();


    }
    cp = ctrack.getCurrentParameters();

    er = ec.meanPredict(cp);
    // console.log(er[0]);
    if (er) {
        updateData(er);
        for (var i = 0; i < er.length; i++) {
            if (er[i].value > 0.4) {
                document.getElementById('icon' + (i + 1)).style.visibility = 'visible';
            } else {
                document.getElementById('icon' + (i + 1)).style.visibility = 'hidden';
            }
        }
    }

}





function updateData(data) {
    // update
    var rects = svg.selectAll("rect")
        .data(data)
        .attr("y", function(datum) {
            return height - y(datum.value);
        })
        .attr("height", function(datum) {
            return y(datum.value);
        });
    var texts = svg.selectAll("text.labels")
        .data(data)
        .attr("y", function(datum) {
            return height - y(datum.value);
        })
        .text(function(datum) {
            return datum.value.toFixed(1);
        });

    // enter 
    rects.enter().append("svg:rect");
    texts.enter().append("svg:text");

    // exit
    rects.exit().remove();
    texts.exit().remove();
}



function initChart() {
    dps = []; // dataPoints

    chart = new CanvasJS.Chart("chartContainer", {
        title: {
            text: "Green"
        },
        data: [{
            type: "line",
            dataPoints: dps
        }]
    });

    dpsFFT = []; // dataPoints

    chartFFT = new CanvasJS.Chart("chartContainerFFT", {
        title: {
            text: "FFT"
        },
        data: [{
            type: "line",
            dataPoints: dpsFFT
        }]
    });

    xVal = 0;
    yVal = 100;
    updateInterval = 20;
    dataLength = 500; // number of dataPoints visible at any point
}

function updateChart(yyVal) {


    yVal = yyVal;
    dps.push({
        x: xVal,
        y: yVal
    });
    xVal++;

    if (dps.length > dataLength) {
        dps.shift();
    }

    chart.render();

}


function fftCount() {

    var max = 1000;
    var numMax = 0;
    var numInd, numFFT;

    // data = new complex_array.ComplexArray(greenArray.length)
    if (greenArray.length > max) {
        data = new complex_array.ComplexArray(max)

        data.map(function(value, i, n) {
            value.real = greenArray[greenArray.length + i - max];
        })

        data.FFT();

        // for (var i = 0; i < data.real.length/2; i++) {
        for (var i = 0; i < 100; i++) {
            numFFT = (Math.abs(data.imag[i + 1]) * Math.abs(data.imag[i + 1]) + Math.abs(data.real[i + 1]) * Math.abs(data.real[i + 1]));
            if (i < 30) numFFT = 0;
            dpsFFT[i] = ({
                x: i * 1.5,
                y: numFFT
            });
            if (numFFT > numMax) {
                numMax = numFFT;
                numInd = i * 1.5;
            }
        }
        // if (numInd > max / 2) numInd = max - numInd;
        var times=(new Date().getTime() / 1000) - seconds;
        console.log ('angry'+','+er[0].value+','+'sad'+','+er[1].value+','+'surpraised'+','+er[2].value+','+'happy'+','+er[03].value+','+'timestamp'+','+times+','+'pulse'+numInd)
        // console.log(numInd);
        chartFFT.render();
    }
}
