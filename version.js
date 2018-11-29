versionLink = document.getElementById("version");

Version = {};

Version.number = "0.0";
Version.prefix = "v";

function versionLinkUpdate(){
	versionLink.innerHTML = Version.prefix + Version.number;
}

function versionNumber(val){
	Version.number = val;
	versionLinkUpdate();
}

function versionPrefix(val){
	Version.prefix = val;
	versionLinkUpdate();
}

function setVersion(p,n){
	Version.prefix = p;
	Version.number = n;
	versionLinkUpdate();
}

if(versionLink.tagName === "A"){
	versionLink.setAttribute("href","./changelog.txt");
}

versionLinkUpdate();