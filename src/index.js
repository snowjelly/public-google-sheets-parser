// import fetch from '../src/fetch.js';
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const browserFetch = isBrowser ? /* istanbul ignore next */window.fetch : null;


class PublicGoogleSheetsParser {
  constructor (spreadsheetId, option) {
    this.id = spreadsheetId
    this.setOption(option)
  }

  setOption (option) {
    if (!option) {
      this.sheetName = this.sheetName || null
      this.sheetId = this.sheetId || null
      this.useFormattedDate = this.useFormattedDate || false
      this.useFormat = this.useFormat || false
    } else if (typeof option === 'string') {
      this.sheetName = option
      this.sheetId = this.sheetId || null
    } else if (typeof option === 'object') {
      this.sheetName = option.sheetName || this.sheetName
      this.sheetId = option.sheetId || this.sheetId
      this.useFormattedDate = option.hasOwnProperty('useFormattedDate') ? option.useFormattedDate : this.useFormattedDate
      this.useFormat = option.hasOwnProperty('useFormat') ? option.useFormat : this.useFormat
    }
  }

  isDate (date) {
    return date && typeof date === 'string' && /Date\((\d+),(\d+),(\d+)\)/.test(date)
  }

  async getSpreadsheetDataUsingFetch () {
    if (!this.id) return null

    let url = `https://docs.google.com/spreadsheets/d/${this.id}/gviz/tq?`
    url += this.sheetId ? `gid=${this.sheetId}` : `sheet=${this.sheetName}`

    try {
      if (browserFetch !== null) {
      const response = await browserFetch(url)
      return response && response.ok ? response.text() : null

      } else {
      const response = await fetch(url)
      return response && response.ok ? response.text() : null
        
      }
    } catch (e) {
      /* istanbul ignore next */
      console.error('Error fetching spreadsheet data:', e)
      /* istanbul ignore next */
      return null
    }
  }

  normalizeRow (rows) {
    return rows.map((row) => (row && (row.v !== null && row.v !== undefined)) ? row : {})
  }

  applyHeaderIntoRows (header, rows) {
    return rows
      .map(({ c: row }) => {
        // console.log(this.normalizeRow(row))
        // this cleans up the output, doesnt mess with any of the data we need to extract
        return this.normalizeRow(row);
      })
      .map((row) => {
        // console.log(row)
        // all this does is remove all of the empty cells afaik
        // this is never true in my case btw so the object assginemnt always happewns
        // row.reduce((p, c, i) => (c.v !== null && c.v !== undefined));

        
        return row.reduce(
          (p, c, i) =>
            (c.v !== null && c.v !== undefined) ? Object.assign(
              // assign the previous object another object
              p,
              {
              // we get the name of the header inside the row's cells using [header[i]] and set that
              // as the key name for the current row cell or value. then, the value is the result of a ternary operation
                [header[i]]:
                // if we are using useFormat then the header key will be set to the current value.f or current value.v depending
                // on which one exists first
                
                this.useFormat ? c.f || c.v :
                // if we aren't, then check if we are using useformatteddate
                this.useFormattedDate
                // we then also check if current value.v is a date using isDate
                && this.isDate(c.v) ?
                // if it is, return c.f or c.v depending on which one exists first.
                c.f || c.v
                // if c.v is not a date then we just return c.v anyway
                : c.v
              }
        )
        // this part is still inside the reduce function, so we return this instead of running Object.assign
        // on each row's values
        // if c.v is null or undefined, then, we return this for each value in the reduce function
        // we are returning,,,, (back after figuring this out) returning the previous value and then setting our options for the reduce function to nothing
        // thank you for so kindly reminding me this is valid js, kind open source developer :)
         : p, {}
        )


        return row.reduce((p, c, i) => (c.v !== null && c.v !== undefined) ? Object.assign(p, { [header[i]]: this.useFormat ? c.f || c.v : this.useFormattedDate && this.isDate(c.v) ? c.f || c.v : c.v }) : p, {})
      })
  }

  getItems (spreadsheetResponse) {
    let rows = []

    try {
      const payloadExtractRegex = /google\.visualization\.Query\.setResponse\(({.*})\);/
      const [_, payload] = spreadsheetResponse.match(payloadExtractRegex)
      const parsedJSON = JSON.parse(payload)
      const hasSomeLabelPropertyInCols = parsedJSON.table.cols.some(({ label }) => !!label)
      if (hasSomeLabelPropertyInCols) {
        const header = parsedJSON.table.cols.map(({ label }) => label)

        rows = this.applyHeaderIntoRows(header, parsedJSON.table.rows)
      } else {
        const [headerRow, ...originalRows] = parsedJSON.table.rows
        const header = this.normalizeRow(headerRow.c).map((row) => row.v)

        rows = this.applyHeaderIntoRows(header, originalRows)
      }
    } catch (e) {
      /* istanbul ignore next */
      console.error('Error parsing spreadsheet data:', e)
    }

    return rows
  }

  async parse (spreadsheetId, option) {
    if (spreadsheetId) this.id = spreadsheetId
    if (option) this.setOption(option)

    if (!this.id) throw new Error('SpreadsheetId is required.')

    const spreadsheetResponse = await this.getSpreadsheetDataUsingFetch()

    if (spreadsheetResponse === null) return []

    return this.getItems(spreadsheetResponse)
  }
}

/* istanbul ignore next */
if (isBrowser && typeof module === 'undefined') {
  window.PublicGoogleSheetsParser = PublicGoogleSheetsParser
} 

  export default PublicGoogleSheetsParser
